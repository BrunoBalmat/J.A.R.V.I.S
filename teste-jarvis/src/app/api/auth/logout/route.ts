import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyUserToken } from "@/lib/auth";
import { logSystemAction, LOG_ACTIONS } from "@/lib/logger";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
	try {
		// Verificar token antes do logout para registrar quem está saindo
		const cookieStore = await cookies();
		const token = cookieStore.get("token")?.value ?? "";
		const payload = verifyUserToken(token);

		const response = NextResponse.redirect(new URL("/", request.url));
		response.cookies.set("token", "", {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 0,
			path: "/",
		});

		// Log de logout se o usuário estava autenticado
		if (payload) {
			await logSystemAction({
				userId: payload.userId,
				userName: payload.email || 'Usuário desconhecido',
				userCpf: 'CPF não disponível no token',
				action: LOG_ACTIONS.LOGOUT,
				details: 'Logout realizado com sucesso',
				request,
			});
		}

		return response;
	} catch (error) {
		console.error("Erro no logout:", error);
		// Mesmo com erro, tentar fazer o logout
		const response = NextResponse.redirect(new URL("/", request.url));
		response.cookies.set("token", "", {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 0,
			path: "/",
		});
		return response;
	}
}


