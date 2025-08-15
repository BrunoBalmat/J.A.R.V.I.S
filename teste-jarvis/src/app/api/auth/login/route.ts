import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signUserToken, verifyPassword } from "@/lib/auth";
import { logSystemAction, LOG_ACTIONS } from "@/lib/logger";
import type { NextRequest } from "next/server";

const LoginSchema = z.object({
	name: z.string().trim().min(1, "Nome é obrigatório"),
	cpf: z.string().trim().min(10, "CPF deve ter pelo menos 10 dígitos").max(14, "CPF deve ter no máximo 14 dígitos"),
	password: z.string().min(6, "Senha é obrigatória"),
});

export async function POST(request: NextRequest) {
	try {
		const json = await request.json();
		const { name, cpf, password } = LoginSchema.parse(json);

		const user = await prisma.user.findFirst({
			where: { name, cpf },
		});

		if (!user || !(await verifyPassword(password, user.passwordHash))) {
			// Log de tentativa de login falhada
			await logSystemAction({
				userId: 'unknown',
				userName: name,
				userCpf: cpf,
				action: LOG_ACTIONS.LOGIN,
				details: 'Tentativa de login falhada - credenciais inválidas',
				request,
			});

			return NextResponse.json(
				{ error: "Nome, CPF ou senha inválidos" },
				{ status: 401 }
			);
		}

		const token = signUserToken({ userId: user.id, email: user.email || "" });
		const response = NextResponse.json({
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				cpf: user.cpf,
			},
		});

		response.cookies.set("token", token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 60 * 60 * 24 * 7,
			path: "/",
		});

		// Log de login bem-sucedido
		await logSystemAction({
			userId: user.id,
			userName: user.name,
			userCpf: user.cpf,
			action: LOG_ACTIONS.LOGIN,
			details: 'Login realizado com sucesso',
			request,
		});

		return response;
	} catch (error) {
		console.error("Erro no login:", error);
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


