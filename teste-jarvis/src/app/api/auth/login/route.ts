import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signUserToken, verifyPassword } from "@/lib/auth";

const LoginSchema = z.object({
	email: z.string().trim().email(),
	password: z.string().min(6),
});

export async function POST(request: Request) {
	try {
		const json = await request.json();
		const { email, password } = LoginSchema.parse(json);

		const user = await prisma.user.findUnique({ where: { email } });
		if (!user) {
			return NextResponse.json(
				{ error: "Invalid email or password" },
				{ status: 401 }
			);
		}

		const isValid = await verifyPassword(password, user.passwordHash);
		if (!isValid) {
			return NextResponse.json(
				{ error: "Invalid email or password" },
				{ status: 401 }
			);
		}

		const token = signUserToken({ userId: user.id, email: user.email });
		const response = NextResponse.json({
			user: { id: user.id, email: user.email, name: user.name },
		});
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


