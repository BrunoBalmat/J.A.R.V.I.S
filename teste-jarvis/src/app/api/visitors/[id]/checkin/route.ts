import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUserToken } from "@/lib/auth";
import { logSystemAction, LOG_ACTIONS } from "@/lib/logger";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
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

		const { id } = await params;

		// Verificar se o visitante existe
		const existingVisitor = await prisma.visitor.findUnique({
			where: { id },
		});

		if (!existingVisitor) {
			// Log de tentativa de check-in de visitante inexistente
			if (user) {
				await logSystemAction({
					userId: user.id,
					userName: user.name,
					userCpf: user.cpf,
					action: LOG_ACTIONS.CHECKIN_VISITOR,
					details: 'Tentativa de check-in de visitante inexistente',
					targetId: id,
					request,
				});
			}

			return NextResponse.json(
				{ error: "Visitante não encontrado" },
				{ status: 404 }
			);
		}

		// Verificar se já existe um visitante ativo com o mesmo CPF
		const activeVisitor = await prisma.visitor.findFirst({
			where: {
				cpf: existingVisitor.cpf,
				checkOut: null, // Apenas visitantes ativos (sem check-out)
			},
		});

		if (activeVisitor) {
			// Log de tentativa de check-in de visitante já ativo
			if (user) {
				await logSystemAction({
					userId: user.id,
					userName: user.name,
					userCpf: user.cpf,
					action: LOG_ACTIONS.CHECKIN_VISITOR,
					details: `Tentativa de check-in de visitante já ativo - ${existingVisitor.name}`,
					targetId: existingVisitor.id,
					targetName: existingVisitor.name,
					request,
				});
			}

			return NextResponse.json(
				{ error: `Visitante ${existingVisitor.name} já está com check-in ativo` },
				{ status: 400 }
			);
		}

		// Verificar limite de 3 usuários ativos por sala
		const activeVisitorsInRoom = await prisma.visitor.count({
			where: {
				salaDestino: existingVisitor.salaDestino,
				checkOut: null, // Apenas visitantes ativos (sem check-out)
			},
		});

		if (activeVisitorsInRoom >= 3) {
			// Log de tentativa de check-in com sala cheia
			if (user) {
				await logSystemAction({
					userId: user.id,
					userName: user.name,
					userCpf: user.cpf,
					action: LOG_ACTIONS.CHECKIN_VISITOR,
					details: `Tentativa de check-in na ${existingVisitor.salaDestino} - sala cheia`,
					targetId: existingVisitor.id,
					targetName: existingVisitor.name,
					request,
				});
			}

			return NextResponse.json(
				{ error: `A ${existingVisitor.salaDestino} já possui 3 visitantes ativos. Limite máximo atingido.` },
				{ status: 400 }
			);
		}

		// Criar novo registro de check-in
		const newVisitor = await prisma.visitor.create({
			data: {
				name: existingVisitor.name,
				cpf: existingVisitor.cpf,
				salaDestino: existingVisitor.salaDestino,
				dataNascimento: existingVisitor.dataNascimento,
				email: existingVisitor.email,
			},
		});

		// Log de check-in bem-sucedido
		if (user) {
			await logSystemAction({
				userId: user.id,
				userName: user.name,
				userCpf: user.cpf,
				action: LOG_ACTIONS.CHECKIN_VISITOR,
				details: `Check-in realizado - ${newVisitor.salaDestino}`,
				targetId: newVisitor.id,
				targetName: newVisitor.name,
				request,
			});
		}

		return NextResponse.json({ visitor: newVisitor });
	} catch (error) {
		console.error("Erro ao fazer check-in:", error);
		return NextResponse.json(
			{ error: "Erro interno do servidor" },
			{ status: 500 }
		);
	}
}
