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
		const limit = parseInt(searchParams.get("limit") || "100");
		const offset = parseInt(searchParams.get("offset") || "0");
		const action = searchParams.get("action");
		const userId = searchParams.get("userId");

		// Construir filtros
		const where: any = {};
		if (action) {
			where.action = action;
		}
		if (userId) {
			where.userId = userId;
		}

		// Buscar logs com paginação
		const logs = await prisma.systemLog.findMany({
			where,
			orderBy: { createdAt: "desc" },
			take: Math.min(limit, 1000), // Limite máximo de 1000
			skip: offset,
			include: {
				user: {
					select: {
						id: true,
						name: true,
						cpf: true,
						email: true,
					}
				}
			}
		});

		// Contar total de logs
		const total = await prisma.systemLog.count({ where });

		// Log de acesso aos logs do sistema
		if (user) {
			await logSystemAction({
				userId: user.id,
				userName: user.name,
				userCpf: user.cpf,
				action: 'view_system_logs',
				details: `Logs do sistema acessados - ${logs.length} de ${total} registros`,
				request,
			});
		}

		return NextResponse.json({
			logs,
			total,
			limit,
			offset,
			hasMore: offset + logs.length < total,
		});
	} catch (error) {
		console.error("Erro ao buscar logs do sistema:", error);
		return NextResponse.json(
			{ error: "Erro interno do servidor" },
			{ status: 500 }
		);
	}
}

