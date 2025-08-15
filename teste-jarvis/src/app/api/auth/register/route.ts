import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, signUserToken } from "@/lib/auth";
import { logSystemAction, LOG_ACTIONS } from "@/lib/logger";
import type { NextRequest } from "next/server";

const RegisterSchema = z.object({
	name: z.string().trim().min(1, "Nome é obrigatório"),
	email: z.string().trim().optional(),
	cpf: z.string().trim().min(10, "CPF deve ter pelo menos 10 dígitos").max(14, "CPF deve ter no máximo 14 dígitos"),
	password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

export async function POST(request: NextRequest) {
	try {
		const json = await request.json();
		const { name, email, cpf, password } = RegisterSchema.parse(json);

		// Verificar se CPF já existe
		const existingCpf = await prisma.user.findUnique({
			where: { cpf },
		});

		if (existingCpf) {
			// Log de tentativa de registro com CPF duplicado
			await logSystemAction({
				userId: 'unknown',
				userName: name,
				userCpf: cpf,
				action: LOG_ACTIONS.REGISTER,
				details: 'Tentativa de registro com CPF já existente',
				request,
			});

			return NextResponse.json(
				{ error: "CPF já está em uso" },
				{ status: 400 }
			);
		}

		// Verificar se email já existe (se fornecido)
		if (email && email.trim() !== "") {
			const existingEmail = await prisma.user.findUnique({
				where: { email },
			});

			if (existingEmail) {
				// Log de tentativa de registro com email duplicado
				await logSystemAction({
					userId: 'unknown',
					userName: name,
					userCpf: cpf,
					action: LOG_ACTIONS.REGISTER,
					details: 'Tentativa de registro com email já existente',
					request,
				});

				return NextResponse.json(
					{ error: "Email já está em uso" },
					{ status: 400 }
				);
			}
		}

		const passwordHash = await hashPassword(password);
		const user = await prisma.user.create({
			data: {
				email: email && email.trim() !== "" ? email : null,
				name,
				cpf,
				passwordHash,
			},
			select: { id: true, email: true, name: true, cpf: true },
		});

		const token = signUserToken({ userId: user.id, email: user.email || "" });
		const response = NextResponse.json({ user });
		response.cookies.set("token", token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 60 * 60 * 24 * 7,
			path: "/",
		});

		// Log de registro bem-sucedido
		await logSystemAction({
			userId: user.id,
			userName: user.name,
			userCpf: user.cpf,
			action: LOG_ACTIONS.REGISTER,
			details: 'Usuário registrado com sucesso',
			request,
		});

		return response;
	} catch (error) {
		console.error("Erro no registro:", error);
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


