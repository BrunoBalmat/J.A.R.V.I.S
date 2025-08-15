import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUserToken } from "@/lib/auth";
import { logSystemAction, LOG_ACTIONS } from "@/lib/logger";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

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

		// Buscar todos os visitantes ordenados por data de check-in (mais recente primeiro)
		const visitors = await prisma.visitor.findMany({
			orderBy: { checkIn: "desc" },
			select: {
				id: true,
				name: true,
				cpf: true,
				salaDestino: true,
				dataNascimento: true,
				email: true,
				checkIn: true,
				checkOut: true,
				createdAt: true,
			},
		});

		// Processar dados para o histórico
		const history = visitors.map(visitor => ({
			id: visitor.id,
			name: visitor.name,
			cpf: visitor.cpf,
			salaDestino: visitor.salaDestino,
			dataNascimento: visitor.dataNascimento,
			email: visitor.email,
			checkIn: visitor.checkIn,
			checkOut: visitor.checkOut,
			createdAt: visitor.createdAt,
			status: visitor.checkOut ? "Checkout" : "Ativo",
			duration: visitor.checkOut 
				? Math.round((new Date(visitor.checkOut).getTime() - new Date(visitor.checkIn).getTime()) / (1000 * 60 * 60 * 1000) * 100) / 100 // Horas com 2 casas decimais
				: null,
		}));

		const result = {
			history,
			total: history.length,
			active: history.filter(h => h.status === "Ativo").length,
			completed: history.filter(h => h.status === "Checkout").length,
		};

		// Log de acesso ao histórico
		if (user) {
			await logSystemAction({
				userId: user.id,
				userName: user.name,
				userCpf: user.cpf,
				action: LOG_ACTIONS.VIEW_HISTORY,
				details: `Histórico acessado - ${result.total} registros (${result.active} ativos, ${result.completed} checkouts)`,
				request,
			});
		}

		return NextResponse.json(result);
	} catch (error) {
		console.error("Erro ao buscar histórico:", error);
		return NextResponse.json(
			{ error: "Erro interno do servidor" },
			{ status: 500 }
		);
	}
}
