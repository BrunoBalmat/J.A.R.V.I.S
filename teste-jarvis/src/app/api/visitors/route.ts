import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyUserToken } from "@/lib/auth";
import { logSystemAction, LOG_ACTIONS } from "@/lib/logger";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

const VisitorSchema = z.object({
	name: z.string().trim().min(1, "Nome é obrigatório"),
	cpf: z.string().trim().min(10, "CPF deve ter pelo menos 10 dígitos").max(14, "CPF deve ter no máximo 14 dígitos"),
	salaDestino: z.string().trim().min(1, "Sala destino é obrigatória"),
	dataNascimento: z.string().optional(),
	email: z.string().trim().optional(),
});

export async function POST(request: NextRequest) {
	try {
		// Verificar autenticação
		const cookieStore = await cookies();
		const token = cookieStore.get("token")?.value ?? "";
		const payload = verifyUserToken(token);
		
		if (!payload) {
			return NextResponse.json(
				{ error: "Não autorizado" },
				{ status: 401 }
			);
		}

		// Buscar informações do usuário para o log
		const user = await prisma.user.findUnique({
			where: { id: payload.userId },
			select: { id: true, name: true, cpf: true }
		});

		const json = await request.json();
		const { name, cpf, salaDestino, dataNascimento, email } = VisitorSchema.parse(json);

		// Validar email se fornecido
		if (email && email.trim() !== "") {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(email)) {
				return NextResponse.json(
					{ error: "Email inválido" },
					{ status: 400 }
				);
			}
		}

		// Verificar limite de 3 usuários ativos por sala
		const activeVisitorsInRoom = await prisma.visitor.count({
			where: {
				salaDestino: salaDestino,
				checkOut: null, // Apenas visitantes ativos (sem check-out)
			},
		});

		if (activeVisitorsInRoom >= 3) {
			// Log de tentativa de criação com sala cheia
			if (user) {
				await logSystemAction({
					userId: user.id,
					userName: user.name,
					userCpf: user.cpf,
					action: LOG_ACTIONS.CREATE_VISITOR,
					details: `Tentativa de criação de visitante na ${salaDestino} - sala cheia`,
					targetName: name,
					request,
				});
			}

			return NextResponse.json(
				{ error: `A ${salaDestino} já possui 3 visitantes ativos. Limite máximo atingido.` },
				{ status: 400 }
			);
		}

		const visitor = await prisma.visitor.create({
			data: {
				name,
				cpf,
				salaDestino,
				dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
				email: email && email.trim() !== "" ? email : null,
			},
		});

		// Log de criação bem-sucedida
		if (user) {
			await logSystemAction({
				userId: user.id,
				userName: user.name,
				userCpf: user.cpf,
				action: LOG_ACTIONS.CREATE_VISITOR,
				details: `Visitante criado na ${salaDestino}`,
				targetId: visitor.id,
				targetName: visitor.name,
				request,
			});
		}

		return NextResponse.json({ visitor });
	} catch (error) {
		console.error("Erro ao criar visitante:", error);
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "Dados inválidos", details: error.flatten() },
				{ status: 400 }
			);
		}
		return NextResponse.json(
			{ error: "Erro interno do servidor" },
			{ status: 500 }
		);
	}
}

export async function DELETE(request: NextRequest) {
	try {
		// Verificar autenticação
		const cookieStore = await cookies();
		const token = cookieStore.get("token")?.value ?? "";
		const payload = verifyUserToken(token);
		
		if (!payload) {
			return NextResponse.json(
				{ error: "Não autorizado" },
				{ status: 401 }
			);
		}

		// Buscar informações do usuário para o log
		const user = await prisma.user.findUnique({
			where: { id: payload.userId },
			select: { id: true, name: true, cpf: true }
		});

		const { searchParams } = new URL(request.url);
		const id = searchParams.get("id");

		if (!id) {
			return NextResponse.json(
				{ error: "ID do visitante é obrigatório" },
				{ status: 400 }
			);
		}

		// Verificar se o visitante existe
		const existingVisitor = await prisma.visitor.findUnique({
			where: { id },
		});

		if (!existingVisitor) {
			// Log de tentativa de exclusão de visitante inexistente
			if (user) {
				await logSystemAction({
					userId: user.id,
					userName: user.name,
					userCpf: user.cpf,
					action: LOG_ACTIONS.DELETE_VISITOR,
					details: 'Tentativa de exclusão de visitante inexistente',
					targetId: id,
					request,
				});
			}

			return NextResponse.json(
				{ error: "Visitante não encontrado" },
				{ status: 404 }
			);
		}

		// Verificar se o visitante está ativo (sem check-out)
		if (!existingVisitor.checkOut) {
			// Log de tentativa de exclusão de visitante ativo
			if (user) {
				await logSystemAction({
					userId: user.id,
					userName: user.name,
					userCpf: user.cpf,
					action: LOG_ACTIONS.DELETE_VISITOR,
					details: 'Tentativa de exclusão de visitante ativo',
					targetId: existingVisitor.id,
					targetName: existingVisitor.name,
					request,
				});
			}

			return NextResponse.json(
				{ error: "Não é possível excluir um visitante ativo. Faça o checkout primeiro." },
				{ status: 400 }
			);
		}

		// Excluir o visitante
		await prisma.visitor.delete({
			where: { id },
		});

		// Log de exclusão bem-sucedida
		if (user) {
			await logSystemAction({
				userId: user.id,
				userName: user.name,
				userCpf: user.cpf,
				action: LOG_ACTIONS.DELETE_VISITOR,
				details: 'Visitante excluído com sucesso',
				targetId: existingVisitor.id,
				targetName: existingVisitor.name,
				request,
			});
		}

		return NextResponse.json({ 
			message: "Visitante excluído com sucesso",
			deletedVisitor: existingVisitor
		});
	} catch (error) {
		console.error("Erro ao excluir visitante:", error);
		return NextResponse.json(
			{ error: "Erro interno do servidor" },
			{ status: 500 }
		);
	}
}

export async function GET(request: NextRequest) {
	try {
		// Verificar autenticação
		const cookieStore = await cookies();
		const token = cookieStore.get("token")?.value ?? "";
		const payload = verifyUserToken(token);
		
		if (!payload) {
			return NextResponse.json(
				{ error: "Não autorizado" },
				{ status: 401 }
			);
		}

		// Buscar informações do usuário para o log
		const user = await prisma.user.findUnique({
			where: { id: payload.userId },
			select: { id: true, name: true, cpf: true }
		});

		const visitors = await prisma.visitor.findMany({
			orderBy: { checkIn: "desc" },
		});

		// Log de acesso à lista de visitantes
		if (user) {
			await logSystemAction({
				userId: user.id,
				userName: user.name,
				userCpf: user.cpf,
				action: LOG_ACTIONS.ACCESS_CONTROLE,
				details: `Lista de visitantes acessada - ${visitors.length} registros`,
				request,
			});
		}

		return NextResponse.json({ visitors });
	} catch (error) {
		console.error("Erro ao buscar visitantes:", error);
		return NextResponse.json(
			{ error: "Erro interno do servidor" },
			{ status: 500 }
		);
	}
}
