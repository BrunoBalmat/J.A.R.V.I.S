"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
	const router = useRouter();
	const [name, setName] = useState("");
	const [cpf, setCpf] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	// Função para validar os campos
	const validateFields = () => {
		// Validar nome
		if (!name.trim()) {
			setError("Nome é obrigatório");
			return false;
		}

		// Validar CPF
		const cpfDigits = cpf.replace(/\D/g, '');
		if (cpfDigits.length < 10 || cpfDigits.length > 14) {
			setError("CPF deve ter entre 10 e 14 dígitos");
			return false;
		}

		// Validar senha
		if (!password.trim()) {
			setError("Senha é obrigatória");
			return false;
		}

		return true;
	};

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		
		// Validar campos antes de enviar
		if (!validateFields()) {
			return;
		}

		setLoading(true);
		try {
			const res = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ 
					name, 
					cpf,
					password 
				}),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data?.error ?? "Falha no login");
			}
			router.push("/");
			router.refresh();
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Falha no login");
		} finally {
			setLoading(false);
		}
	}

	// Função para aplicar máscara de CPF
	const applyCpfMask = (value: string) => {
		// Remove tudo que não é dígito
		const numbers = value.replace(/\D/g, '');
		
		// Aplica a máscara
		if (numbers.length <= 3) {
			return numbers;
		} else if (numbers.length <= 6) {
			return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
		} else if (numbers.length <= 9) {
			return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
		} else {
			return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
		}
	};

	// Função para limpar erro quando o usuário começa a digitar
	const clearError = () => {
		if (error) setError(null);
	};

	return (
		<div className="min-h-screen flex items-center justify-center font-good-timing">
			<div className="max-w-md w-full mx-auto p-8">
				{/* Logo J.A.R.V.I.S */}
				<div className="text-center mb-8">
					<h1 className="font-good-timing text-6xl font-bold text-white mb-2 drop-shadow-lg">
						J.A.R.V.I.S
					</h1>
					<p className="text-lg text-white font-medium drop-shadow-md">
						Jarvis Assistant
					</p>
				</div>

				{/* Formulário */}
				<div className="rounded-lg shadow-xl p-6">
					<div className="flex items-center justify-between mb-6">
						<h2 className="text-2xl font-semibold text-gray-400 font-good-timing">Login</h2>
						<Link
							href="/"
							className="text-sm text-gray-400 hover:text-gray-200 transition-colors font-good-timing"
						>
							← Voltar
						</Link>
					</div>
					
					<form onSubmit={onSubmit} className="space-y-4">
						<input
							type="text"
							placeholder="Nome *"
							value={name}
							onChange={(e) => {
								setName(e.target.value);
								clearError();
							}}
							className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:shadow-[0_0_30px_rgba(96,32,128,1)] transition focus:border-transparent font-good-timing placeholder-gray-500"
							required
						/>
						<input
							type="text"
							placeholder="CPF *"
							value={cpf}
							onChange={(e) => {
								setCpf(applyCpfMask(e.target.value));
								clearError();
							}}
							className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:shadow-[0_0_30px_rgba(96,32,128,1)] focus:border-transparent font-good-timing placeholder-gray-500"
							maxLength={14}
							required
						/>
						<input
							type="password"
							placeholder="Senha *"
							value={password}
							onChange={(e) => {
								setPassword(e.target.value);
								clearError();
							}}
							className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:shadow-[0_0_30px_rgba(96,32,128,1)] font-good-timing placeholder-gray-500"
							required
						/>
						<button
							type="submit"
							className="w-full border-2 border-[#6c91bf] text-white rounded-lg px-4 py-3 font-semibold hover:shadow-[0_0_15px_rgba(96,32,128,0.8)] transition-all duration-300 disabled:opacity-60 font-good-timing"
							disabled={loading}
						>
							{loading ? "Entrando..." : "Entrar"}
						</button>
						{error ? (
							<p className="text-red-600 text-sm text-center font-good-timing">{error}</p>
						) : null}
					</form>
				</div>
			</div>
		</div>
	);
}


