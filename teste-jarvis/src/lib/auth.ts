import bcrypt from "bcryptjs";
import jwt, { JwtPayload } from "jsonwebtoken";

type TokenPayload = {
	userId: string;
	email: string;
};

export async function hashPassword(plainPassword: string): Promise<string> {
	const saltRounds = 10;
	return bcrypt.hash(plainPassword, saltRounds);
}

export async function verifyPassword(
	plainPassword: string,
	passwordHash: string
): Promise<boolean> {
	return bcrypt.compare(plainPassword, passwordHash);
}

export function signUserToken(payload: TokenPayload): string {
	const secret = process.env.JWT_SECRET;
	if (!secret) {
		throw new Error("JWT_SECRET is not set");
	}
	return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export function verifyUserToken(token: string): (TokenPayload & JwtPayload) | null {
	const secret = process.env.JWT_SECRET;
	if (!secret) {
		throw new Error("JWT_SECRET is not set");
	}
	try {
		return jwt.verify(token, secret) as TokenPayload & JwtPayload;
	} catch {
		return null;
	}
}


