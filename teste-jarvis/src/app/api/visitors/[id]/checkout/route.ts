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
			// Log de tentativa de checkout de visitante inexistente
			if (user) {
				await logSystemAction({
					userId: user.id,
					userName: user.name,
					userCpf: user.cpf,
					action: LOG_ACTIONS.CHECKOUT_VISITOR,
					details: 'Tentativa de checkout de visitante inexistente',
					targetId: id,
					request,
				});
			}

			return NextResponse.json(
				{ error: "Visitante não encontrado" },
				{ status: 404 }
			);
		}

		// Verificar se já fez checkout
		if (existingVisitor.checkOut) {
			// Log de tentativa de checkout duplicado
			if (user) {
				await logSystemAction({
					userId: user.id,
					userName: user.name,
					userCpf: user.cpf,
					action: LOG_ACTIONS.CHECKOUT_VISITOR,
					details: 'Tentativa de checkout de visitante já com checkout',
					targetId: existingVisitor.id,
					targetName: existingVisitor.name,
					request,
				});
			}

			return NextResponse.json(
				{ error: "Visitante já fez checkout" },
				{ status: 400 }
			);
		}

		const visitor = await prisma.visitor.update({
			where: { id },
			data: { checkOut: new Date() },
		});

		// Log de checkout bem-sucedido
		if (user) {
			await logSystemAction({
				userId: user.id,
				userName: user.name,
				userCpf: user.cpf,
				action: LOG_ACTIONS.CHECKOUT_VISITOR,
				details: `Checkout realizado - ${visitor.salaDestino}`,
				targetId: visitor.id,
				targetName: visitor.name,
				request,
			});
		}

		return NextResponse.json({ visitor });
	} catch (error) {
		console.error("Erro ao fazer checkout:", error);
		return NextResponse.json(
			{ error: "Erro interno do servidor" },
			{ status: 500 }
		);
	}
}
