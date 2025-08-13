"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
	const router = useRouter();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setLoading(true);
		try {
			const res = await fetch("/api/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: name || undefined, email, password }),
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data?.error ?? "Register failed");
			}
			router.push("/");
			router.refresh();
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Register failed");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="max-w-sm w-full mx-auto p-6">
			<h1 className="text-2xl font-semibold mb-4">Create account</h1>
			<form onSubmit={onSubmit} className="space-y-3">
				<input
					type="text"
					placeholder="Name (optional)"
					value={name}
					onChange={(e) => setName(e.target.value)}
					className="w-full border rounded px-3 py-2"
				/>
				<input
					type="email"
					placeholder="Email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					className="w-full border rounded px-3 py-2"
					required
				/>
				<input
					type="password"
					placeholder="Password (min 6 chars)"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					className="w-full border rounded px-3 py-2"
					required
				/>
				<button
					type="submit"
					className="w-full bg-black text-white rounded px-3 py-2 disabled:opacity-60"
					disabled={loading}
				>
					{loading ? "Creating..." : "Create account"}
				</button>
				{error ? (
					<p className="text-red-600 text-sm">{error}</p>
				) : null}
			</form>
		</div>
	);
}


