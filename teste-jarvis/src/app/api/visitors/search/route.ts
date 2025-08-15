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

		const { searchParams } = new URL(request.url);
		const cpf = searchParams.get("cpf");

		if (!cpf) {
			return NextResponse.json(
				{ error: "CPF é obrigatório" },
				{ status: 400 }
			);
		}

		const allVisitors = await prisma.visitor.findMany({
			where: {
				cpf: {
					contains: cpf,
				},
			},
			orderBy: { createdAt: "desc" },
		});

		// Agrupar por CPF e pegar apenas o mais recente de cada visitante
		const uniqueVisitors = new Map();
		allVisitors.forEach(visitor => {
			if (!uniqueVisitors.has(visitor.cpf)) {
				uniqueVisitors.set(visitor.cpf, visitor);
			}
		});

		const visitors = Array.from(uniqueVisitors.values());

		// Log de busca realizada
		if (user) {
			await logSystemAction({
				userId: user.id,
				userName: user.name,
				userCpf: user.cpf,
				action: LOG_ACTIONS.SEARCH_VISITORS,
				details: `Busca por CPF: ${cpf} - ${visitors.length} resultados`,
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
