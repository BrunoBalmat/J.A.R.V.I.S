import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, signUserToken } from "@/lib/auth";

const RegisterSchema = z.object({
	name: z.string().trim().min(1).optional(),
	email: z.string().trim().email(),
	password: z.string().min(6),
});

export async function POST(request: Request) {
	try {
		const json = await request.json();
		const { name, email, password } = RegisterSchema.parse(json);

		const existingUser = await prisma.user.findUnique({ where: { email } });
		if (existingUser) {
			return NextResponse.json(
				{ error: "Email already in use" },
				{ status: 409 }
			);
		}

		const passwordHash = await hashPassword(password);
		const user = await prisma.user.create({
			data: { email, name, passwordHash },
			select: { id: true, email: true, name: true },
		});

		const token = signUserToken({ userId: user.id, email: user.email });
		const response = NextResponse.json({ user });
		response.cookies.set("token", token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 60 * 60 * 24 * 7,
			path: "/",
		});
		return response;
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "Invalid input", details: error.flatten() },
				{ status: 400 }
			);
		}
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}


