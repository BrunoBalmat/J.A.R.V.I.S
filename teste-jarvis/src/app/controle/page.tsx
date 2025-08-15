"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Visitor {
	id: string;
	name: string;
	cpf: string;
	salaDestino: string;
	dataNascimento?: string;
	email?: string;
	checkIn: string;
	checkOut?: string;
}

interface RoomStatus {
	sala: string;
	activeCount: number;
	maxCapacity: number;
}

export default function ControlePage() {
	const [visitors, setVisitors] = useState<Visitor[]>([]);
	const [loading, setLoading] = useState(true);
	const [showForm, setShowForm] = useState(false);
	const [showCheckinForm, setShowCheckinForm] = useState(false);
	const [showInactiveVisitors, setShowInactiveVisitors] = useState(false);
	const [showHistory, setShowHistory] = useState(false);
	const [showSystemLogs, setShowSystemLogs] = useState(false);
	const [formData, setFormData] = useState({
		name: "",
		cpf: "",
		salaDestino: "",
		dataNascimento: "",
		email: "",
	});
	const [searchCpf, setSearchCpf] = useState("");
	const [searchResults, setSearchResults] = useState<Visitor[]>([]);
	const [searching, setSearching] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [deletingVisitor, setDeletingVisitor] = useState<string | null>(null);
	const [history, setHistory] = useState<any[]>([]);
	const [historyStats, setHistoryStats] = useState({ total: 0, active: 0, completed: 0 });
	const [loadingHistory, setLoadingHistory] = useState(false);
	const [systemLogs, setSystemLogs] = useState<any[]>([]);
	const [systemLogsStats, setSystemLogsStats] = useState({ total: 0, limit: 100, offset: 0, hasMore: false });
	const [loadingSystemLogs, setLoadingSystemLogs] = useState(false);
	const router = useRouter();
	const checkinFormRef = useRef<HTMLDivElement>(null);

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

	// Função para mostrar mensagem de erro com timeout
	const showError = (message: string) => {
		setError(message);
		setTimeout(() => {
			setError(null);
		}, 5000);
	};

	// Função para mostrar mensagem de sucesso com timeout
	const showSuccess = (message: string) => {
		setSuccess(message);
		setTimeout(() => {
			setSuccess(null);
		}, 5000);
	};

	// Função para resetar a aba de pesquisa
	const resetCheckinForm = () => {
		setShowCheckinForm(false);
		setSearchCpf("");
		setSearchResults([]);
		setError(null);
	};

	// Função para calcular status das salas
	const calculateRoomStatus = (): RoomStatus[] => {
		const activeVisitors = visitors.filter(v => !v.checkOut);
		const roomMap = new Map<string, number>();
		
		// Contar visitantes ativos por sala
		activeVisitors.forEach(visitor => {
			const count = roomMap.get(visitor.salaDestino) || 0;
			roomMap.set(visitor.salaDestino, count + 1);
		});

		// Criar array com status de todas as salas (1-5)
		const roomStatus: RoomStatus[] = [];
		for (let i = 1; i <= 5; i++) {
			const sala = `Sala ${i}`;
			const activeCount = roomMap.get(sala) || 0;
			roomStatus.push({
				sala,
				activeCount,
				maxCapacity: 3
			});
		}

		return roomStatus;
	};

	// Carregar visitantes
	const loadVisitors = async () => {
		try {
			const res = await fetch("/api/visitors");
			if (!res.ok) throw new Error("Erro ao carregar visitantes");
			const data = await res.json();
			setVisitors(data.visitors);
		} catch (err) {
			showError("Erro ao carregar visitantes");
		} finally {
			setLoading(false);
		}
	};

	// Verificar autenticação e recarregar dados
	const checkAuthAndReload = async () => {
		try {
			const res = await fetch("/api/visitors");
			if (res.status === 401) {
				// Usuário não autenticado, redirecionar para login
				router.push("/login");
				return;
			}
			if (!res.ok) throw new Error("Erro ao verificar autenticação");
			
			// Usuário autenticado, recarregar dados
			const data = await res.json();
			setVisitors(data.visitors);
		} catch (err) {
			console.error("Erro ao verificar autenticação:", err);
		}
	};

	useEffect(() => {
		loadVisitors();
		
		// Verificar autenticação periodicamente (a cada 30 segundos)
		const authInterval = setInterval(checkAuthAndReload, 30000);
		
		// Listener para mudanças de rota (login/logout)
		const handleRouteChange = () => {
			// Pequeno delay para garantir que a mudança de rota foi processada
			setTimeout(() => {
				checkAuthAndReload();
			}, 100);
		};

		// Adicionar listener para mudanças de rota
		window.addEventListener('popstate', handleRouteChange);
		
		// Cleanup
		return () => {
			clearInterval(authInterval);
			window.removeEventListener('popstate', handleRouteChange);
		};
	}, [router]);

	// Listener para clique fora e tecla ESC
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (checkinFormRef.current && !checkinFormRef.current.contains(event.target as Node)) {
				resetCheckinForm();
			}
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				resetCheckinForm();
			}
		};

		if (showCheckinForm) {
			document.addEventListener('mousedown', handleClickOutside);
			document.addEventListener('keydown', handleKeyDown);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [showCheckinForm]);

	// Buscar visitantes por CPF
	const searchVisitors = async () => {
		if (!searchCpf.trim()) {
			showError("Digite um CPF para buscar");
			return;
		}

		setSearching(true);
		setError(null);
		try {
			const res = await fetch(`/api/visitors/search?cpf=${encodeURIComponent(searchCpf)}`);
			if (!res.ok) throw new Error("Erro ao buscar visitantes");
			const data = await res.json();
			setSearchResults(data.visitors);
			if (data.visitors.length === 0) {
				showError("Nenhum visitante encontrado com este CPF");
			}
		} catch (err) {
			showError("Erro ao buscar visitantes");
		} finally {
			setSearching(false);
		}
	};

	// Cadastrar novo visitante
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setSuccess(null);

		// Validação básica
		if (!formData.name.trim() || !formData.cpf.trim() || !formData.salaDestino.trim()) {
			showError("Nome, CPF e Sala Destino são obrigatórios");
			return;
		}

		// Validar CPF
		const cpfDigits = formData.cpf.replace(/\D/g, '');
		if (cpfDigits.length < 10 || cpfDigits.length > 14) {
			showError("CPF deve ter entre 10 e 14 dígitos");
			return;
		}

		// Validar email se fornecido
		if (formData.email.trim() !== "") {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(formData.email)) {
				showError("Email inválido");
				return;
			}
		}

		try {
			const res = await fetch("/api/visitors", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(formData),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Erro ao cadastrar visitante");
			}

			showSuccess("Visitante cadastrado com sucesso!");
			setFormData({
				name: "",
				cpf: "",
				salaDestino: "",
				dataNascimento: "",
				email: "",
			});
			setShowForm(false);
			loadVisitors(); // Recarregar lista
		} catch (err) {
			showError(err instanceof Error ? err.message : "Erro ao cadastrar visitante");
		}
	};

	// Fazer check-in de visitante existente
	const handleCheckin = async (visitorId: string) => {
		try {
			const res = await fetch(`/api/visitors/${visitorId}/checkin`, {
				method: "POST",
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Erro ao fazer check-in");
			}
			
			showSuccess("Check-in realizado com sucesso!");
			resetCheckinForm();
			loadVisitors(); // Recarregar lista
		} catch (err) {
			showError(err instanceof Error ? err.message : "Erro ao fazer check-in");
		}
	};

	// Fazer checkout
	const handleCheckout = async (visitorId: string) => {
		try {
			const res = await fetch(`/api/visitors/${visitorId}/checkout`, {
				method: "POST",
			});

			if (!res.ok) throw new Error("Erro ao fazer checkout");
			
			showSuccess("Checkout realizado com sucesso!");
			loadVisitors(); // Recarregar lista
		} catch (err) {
			showError("Erro ao fazer checkout");
		}
	};

	// Excluir visitante
	const handleDeleteVisitor = async (visitorId: string) => {
		if (!confirm("Tem certeza que deseja excluir este visitante? Esta ação não pode ser desfeita.")) {
			return;
		}

		setDeletingVisitor(visitorId);
		try {
			const res = await fetch(`/api/visitors?id=${visitorId}`, {
				method: "DELETE",
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Erro ao excluir visitante");
			}

			showSuccess("Visitante excluído com sucesso!");
			loadVisitors(); // Recarregar lista
		} catch (err) {
			showError(err instanceof Error ? err.message : "Erro ao excluir visitante");
		} finally {
			setDeletingVisitor(null);
		}
	};

	// Carregar histórico
	const loadHistory = async () => {
		setLoadingHistory(true);
		try {
			const res = await fetch("/api/visitors/history");
			if (!res.ok) throw new Error("Erro ao carregar histórico");
			const data = await res.json();
			setHistory(data.history);
			setHistoryStats({
				total: data.total,
				active: data.active,
				completed: data.completed
			});
		} catch (err) {
			showError("Erro ao carregar histórico");
		} finally {
			setLoadingHistory(false);
		}
	};

	// Carregar logs do sistema
	const loadSystemLogs = async (offset = 0) => {
		setLoadingSystemLogs(true);
		try {
			const res = await fetch(`/api/system/logs?limit=50&offset=${offset}`);
			if (!res.ok) throw new Error("Erro ao carregar logs do sistema");
			const data = await res.json();
			setSystemLogs(offset === 0 ? data.logs : [...systemLogs, ...data.logs]);
			setSystemLogsStats({
				total: data.total,
				limit: data.limit,
				offset: data.offset,
				hasMore: data.hasMore
			});
		} catch (err) {
			showError("Erro ao carregar logs do sistema");
		} finally {
			setLoadingSystemLogs(false);
		}
	};

	// Formatar data
	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleString("pt-BR");
	};

	// Formatar data de nascimento
	const formatBirthDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("pt-BR");
	};

	// Verificar se visitante está ativo
	const isVisitorActive = (visitor: Visitor) => {
		return !visitor.checkOut;
	};

	// Filtrar apenas visitantes ativos
	const activeVisitors = visitors.filter(isVisitorActive);

	// Filtrar apenas visitantes inativos
	const inactiveVisitors = visitors.filter(v => v.checkOut);

	// Calcular status das salas
	const roomStatus = calculateRoomStatus();

	// Limpar mensagens
	const clearMessages = () => {
		setError(null);
		setSuccess(null);
	};

	// Função para forçar atualização dos dados
	const refreshData = () => {
		loadVisitors();
		if (searchCpf.trim()) {
			searchVisitors();
		}
		if (showHistory) {
			loadHistory();
		}
		if (showSystemLogs) {
			loadSystemLogs();
		}
	};

	// Função para obter cor do status da sala
	const getRoomStatusColor = (room: RoomStatus) => {
		if (room.activeCount >= room.maxCapacity) {
			return "text-red-600 border-red-300";
		} else if (room.activeCount >= room.maxCapacity * 0.8) {
			return "text-orange-600 bg-orange-100 border-orange-300";
		} else {
			return "text-white border-green-300";
		}
	};

	// Função para obter cor do status do histórico
	const getHistoryStatusColor = (status: string) => {
		return status === "Ativo" 
			? "text-green-800 border-green-300" 
			: "text-blue-800 border-blue-300";
	};

	// Função para obter cor da ação do log
	const getLogActionColor = (action: string) => {
		const actionColors: { [key: string]: string } = {
			'login': 'bg-green-100 text-green-800 border-green-300',
			'logout': 'bg-red-100 text-red-800 border-red-300',
			'register': 'bg-blue-100 text-blue-800 border-blue-300',
			'create_visitor': 'bg-purple-100 text-purple-800 border-purple-300',
			'checkin_visitor': 'bg-green-100 text-green-800 border-green-300',
			'checkout_visitor': 'bg-orange-100 text-orange-800 border-orange-300',
			'delete_visitor': 'bg-red-100 text-red-800 border-red-300',
			'search_visitors': 'bg-indigo-100 text-indigo-800 border-indigo-300',
			'view_history': 'bg-cyan-100 text-cyan-800 border-cyan-300',
			'access_controle': 'bg-gray-100 text-gray-800 border-gray-300',
			'refresh_data': 'bg-yellow-100 text-yellow-800 border-yellow-300',
			'view_system_logs': 'bg-pink-100 text-pink-800 border-pink-300',
		};
		return actionColors[action] || 'bg-gray-100 text-gray-800 border-gray-300';
	};

	if (loading) {
	return (
			<div className="max-w-6xl mx-auto p-6 font-good-timing">
				<div className="text-center">Carregando...</div>
		</div>
	);
}

	return (
		<>
			{/* Toast de Erro - Posição Fixa no Canto Superior Direito */}
			{error && (
				<div className="fixed top-4 right-4 z-50 max-w-sm w-full">
					<div className="bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg border-l-4 border-red-600 transform transition-all duration-300 ease-in-out animate-slide-in-right">
						<div className="flex items-center justify-between">
							<div className="flex items-center">
								<div className="flex-shrink-0">
									<svg className="h-5 w-5 text-red-200" viewBox="0 0 20 20" fill="currentColor">
										<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
									</svg>
								</div>
								<div className="ml-3">
									<p className="text-sm font-medium">{error}</p>
								</div>
							</div>
							<button 
								onClick={clearMessages} 
								className="ml-4 flex-shrink-0 text-red-200 hover:text-white transition-colors"
							>
								<svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
									<path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
								</svg>
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Toast de Sucesso - Posição Fixa no Canto Superior Direito */}
			{success && (
				<div className="fixed top-4 right-4 z-50 max-w-sm w-full">
					<div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg border-l-4 border-green-600 transform transition-all duration-300 ease-in-out animate-slide-in-right">
						<div className="flex items-center justify-between">
							<div className="flex items-center">
								<div className="flex-shrink-0">
									<svg className="h-5 w-5 text-green-200" viewBox="0 0 20 20" fill="currentColor">
										<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
									</svg>
								</div>
								<div className="ml-3">
									<p className="text-sm font-medium">{success}</p>
								</div>
							</div>
							<button 
								onClick={clearMessages} 
								className="ml-4 flex-shrink-0 text-green-200 hover:text-white transition-colors"
							>
								<svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
									<path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
								</svg>
							</button>
						</div>
					</div>
				</div>
			)}

			<div className="max-w-6xl mx-auto p-6 font-good-timing">
				<div className="flex items-center justify-between mb-6">
					<h1 className="text-2xl font-semibold">Controle de Recepção</h1>
					<div className="flex items-center gap-4">
						<Link
							href="/"
							className="border-2 border-[#6c91bf] text-white px-6 py-2 rounded-lg font-semibold hover:shadow-[0_0_15px_rgba(96,32,128,0.8)] transition-all duration-300 disabled:opacity-50 cursor-pointer"
						>
							← Voltar
						</Link>
					</div>
				</div>

				{/* Status das Salas */}
				<div className="mb-6">
					<h2 className="text-lg font-semibold mb-4">Status das Salas</h2>
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
						{roomStatus.map((room) => (
							<div
								key={room.sala}
								className={`p-3 rounded-lg border-2 text-center ${getRoomStatusColor(room)}`}
							>
								<div className="font-bold text-sm">{room.sala}</div>
								<div className="text-xs mt-1">
									{room.activeCount}/{room.maxCapacity}
								</div>
								{room.activeCount >= room.maxCapacity && (
									<div className="text-xs font-bold mt-1">CHEIA</div>
								)}
							</div>
						))}
					</div>
				</div>

				{/* Botões para mostrar/ocultar formulários */}
				<div className="mb-6 flex gap-4 flex-wrap items-center">
					<button
						onClick={() => {
							setShowForm(!showForm);
							setShowCheckinForm(false);
							setShowInactiveVisitors(false);
							setShowHistory(false);
							setShowSystemLogs(false);
						}}
						className="border-2 border-[#6c91bf] text-white px-4 py-2 rounded hover:shadow-[0_0_15px_rgba(96,32,128,0.8)] cursor-pointer"
					>
						Cadastrar Visitante
					</button>
					<button
						onClick={() => {
							setShowCheckinForm(!showCheckinForm);
							setShowForm(false);
							setShowInactiveVisitors(false);
							setShowHistory(false);
							setShowSystemLogs(false);
						}}
						className="border-2 border-[#6c91bf] text-white px-4 py-2 rounded hover:shadow-[0_0_15px_rgba(96,32,128,0.8)] cursor-pointer"
					>
						Check-in Visitante
					</button>
					<button
						onClick={() => {
							setShowInactiveVisitors(!showInactiveVisitors);
							setShowForm(false);
							setShowCheckinForm(false);
							setShowHistory(false);
							setShowSystemLogs(false);
						}}
						className="border-2 border-[#6c91bf] text-white px-4 py-2 rounded hover:shadow-[0_0_15px_rgba(96,32,128,0.8)] cursor-pointer"
					>
						Gerenciar Visitantes
					</button>
					<button
						onClick={() => {
							setShowHistory(!showHistory);
							setShowForm(false);
							setShowCheckinForm(false);
							setShowInactiveVisitors(false);
							setShowSystemLogs(false);
							if (!showHistory) {
								loadHistory();
							}
						}}
						className="border-2 border-[#6c91bf] text-white px-4 py-2 rounded hover:shadow-[0_0_15px_rgba(96,32,128,0.8)] cursor-pointer"
					>
						Histórico Completo
					</button>
					<button
						onClick={() => {
							setShowSystemLogs(!showSystemLogs);
							setShowForm(false);
							setShowCheckinForm(false);
							setShowInactiveVisitors(false);
							setShowHistory(false);
							if (!showSystemLogs) {
								loadSystemLogs();
							}
						}}
						className="border-2 border-[#6c91bf] text-white px-4 py-2 rounded hover:shadow-[0_0_15px_rgba(96,32,128,0.8)] cursor-pointer"
					>
						Logs do Sistema
					</button>
					
					{/* Botão Fechar - aparece quando qualquer seção está ativa */}
					{(showForm || showCheckinForm || showInactiveVisitors || showHistory || showSystemLogs) && (
						<button
							onClick={() => {
								setShowForm(false);
								setShowCheckinForm(false);
								setShowInactiveVisitors(false);
								setShowHistory(false);
								setShowSystemLogs(false);
							}}
							className="border-2 border-red-400 text-red-400 px-4 py-2 rounded hover:shadow-[0_0_15px_rgba(239,68,68,0.8)] transition-all duration-300 cursor-pointer"
						>
							Fechar
						</button>
					)}
				</div>

				{/* Formulário de cadastro */}
				{showForm && (
					<div className="mb-8 p-6 card-primary rounded-2xl">
						<h2 className="text-2xl font-bold text-primary mb-6">Cadastrar Novo Visitante</h2>
						<form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-bold text-primary mb-2">Nome *</label>
								<input
									type="text"
									value={formData.name}
									onChange={(e) => setFormData({ ...formData, name: e.target.value })}
									className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:shadow-[0_0_30px_rgba(96,32,128,1)] transition focus:border-transparent font-good-timing placeholder-gray-500"
									placeholder="Digite o nome completo"
									required
								/>
							</div>
							<div>
								<label className="block text-sm font-bold text-primary mb-2">CPF *</label>
								<input
									type="text"
									value={formData.cpf}
									onChange={(e) => setFormData({ ...formData, cpf: applyCpfMask(e.target.value) })}
									className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:shadow-[0_0_30px_rgba(96,32,128,1)] transition focus:border-transparent font-good-timing placeholder-gray-500"
									placeholder="000.000.000-00"
									maxLength={14}
									required
								/>
							</div>
							<div>
								<label className="block text-sm font-bold text-primary mb-2">Sala Destino *</label>
								<select
									value={formData.salaDestino}
									onChange={(e) => setFormData({ ...formData, salaDestino: e.target.value })}
									className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:shadow-[0_0_30px_rgba(96,32,128,1)] transition focus:border-transparent font-good-timing placeholder-gray-500"
									required
								>
									<option value="">Selecione uma sala</option>
									{Array.from({ length: 5 }, (_, i) => i + 1).map((sala) => {
										const salaName = `Sala ${sala}`;
										const roomInfo = roomStatus.find(r => r.sala === salaName);
										const isFull = roomInfo && roomInfo.activeCount >= roomInfo.maxCapacity;
										
										return (
											<option 
												key={sala} 
												value={salaName}
												disabled={isFull}
											>
												{isFull ? `${salaName} (CHEIA - ${roomInfo?.activeCount}/3)` : salaName}
											</option>
										);
									})}
								</select>
							</div>
							<div>
								<label className="block text-sm font-bold text-primary mb-2">Data de Nascimento</label>
								<input
									type="date"
									value={formData.dataNascimento}
									onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
									className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:shadow-[0_0_30px_rgba(96,32,128,1)] transition focus:border-transparent font-good-timing placeholder-gray-500"
								/>
							</div>
							<div className="md:col-span-2">
								<label className="block text-sm font-bold text-primary mb-2">Email</label>
								<input
									type="email"
									value={formData.email}
									onChange={(e) => setFormData({ ...formData, email: e.target.value })}
									className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:shadow-[0_0_30px_rgba(96,32,128,1)] transition focus:border-transparent font-good-timing placeholder-gray-500"
									placeholder="exemplo@email.com"
								/>
							</div>
							<div className="md:col-span-2">
								<button
									type="submit"
									className="border-2 border-[#6c91bf] text-white px-4 py-2 rounded hover:shadow-[0_0_15px_rgba(96,32,128,0.8)] cursor-pointer"
								>
									Cadastrar Visitante
								</button>
							</div>
						</form>
					</div>
				)}

				{/* Formulário de check-in */}
				{showCheckinForm && (
					<div ref={checkinFormRef} className="mb-8 p-6 rounded-lg border border-green-200">
						<div className="flex items-center justify-between mb-6">
							<h2 className="text-xl font-bold text-white">Check-in de Visitante Existente</h2>
							<button
								onClick={resetCheckinForm}
								className="text-white hover:text-gray-300 transition-colors cursor-pointer"
							>
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
						<div className="mb-4">
							<div className="flex gap-2">
								<input
									type="text"
									value={searchCpf}
									onChange={(e) => setSearchCpf(applyCpfMask(e.target.value))}
									placeholder="Digite o CPF do visitante"
									className="flex-1 border-2 border-green-300 rounded-lg px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 placeholder-gray-500 text-white"
									maxLength={14}
								/>
								<button
									onClick={searchVisitors}
									disabled={searching}
									className="border-2 border-[#6c91bf] text-white px-6 py-2 rounded-lg font-semibold hover:shadow-[0_0_15px_rgba(96,32,128,0.8)] transition-all duration-300 disabled:opacity-50 cursor-pointer"
								>
									{searching ? "Buscando..." : "Buscar"}
								</button>
							</div>
						</div>

						{/* Resultados da busca */}
						{searchResults.length > 0 && (
							<div className="mt-4">
								<h3 className="text-lg font-bold text-white mb-4">Visitantes encontrados:</h3>
								<div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
									{searchResults.map((visitor) => {
										const isActive = isVisitorActive(visitor);
										const roomInfo = roomStatus.find(r => r.sala === visitor.salaDestino);
										const canCheckin = !isActive && roomInfo && roomInfo.activeCount < roomInfo.maxCapacity;
										
										return (
											<div key={visitor.id} className="border-2 border-green-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
												<div className="flex justify-between items-center">
													<div>
														<p className="font-bold text-white text-lg">{visitor.name}</p>
														<p className="text-sm font-semibold text-white">CPF: {visitor.cpf}</p>
														<p className="text-sm font-semibold text-white">Sala: {visitor.salaDestino}</p>
														{visitor.email && (
															<p className="text-sm font-semibold text-white">Email: {visitor.email}</p>
														)}
													</div>
													<div className="text-right">
														<div className={`text-sm px-3 py-1 rounded-full font-bold ${
															isActive 
																? 'text-green-800 border-2 border-green-300' 
																: 'text-white border-2 border-gray-300'
														}`}>
															{isActive ? '🟢 Ativo' : '⚪ Inativo'}
														</div>
														<p className="text-sm font-semibold text-white mt-2">
															{isActive 
																? `Check-in: ${formatDate(visitor.checkIn)}`
																: `Último check-out: ${visitor.checkOut ? formatDate(visitor.checkOut) : 'N/A'}`
															}
														</p>
														{!isActive && (
															<button
																onClick={() => handleCheckin(visitor.id)}
																disabled={!canCheckin}
																className={`px-4 py-2 rounded-lg text-sm font-bold mt-3 shadow-md hover:shadow-lg transition-all duration-200 ${
																	canCheckin
																		? 'text-white border-2 border-[#6c91bf] px-4 py-2 rounded hover:shadow-[0_0_15px_rgba(96,32,128,0.8)]'
																		: 'text-white border-2 border-[#6c91bf] px-4 py-2 rounded hover:shadow-[0_0_15px_rgba(96,32,128,0.8)] cursor-not-allowed'
																}`}
															>
																{canCheckin ? 'Fazer Check-in' : `Sala Cheia (${roomInfo?.activeCount}/3)`}
															</button>
														)}
													</div>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						)}
					</div>
				)}

				{/* Lista de visitantes inativos para exclusão */}
				{showInactiveVisitors && (
					<div className="mb-8 p-6 rounded-lg border border-gray-200">
													<h2 className="text-xl font-bold text-white mb-6">Gerenciar Visitantes Inativos</h2>
							<p className="text-sm text-white mb-4">
							⚠️ Apenas visitantes que já fizeram checkout podem ser excluídos. Visitantes ativos devem fazer checkout primeiro.
						</p>
						
						{inactiveVisitors.length === 0 ? (
							<div className="text-center py-8">
								<div className="text-white text-4xl mb-2"></div>
								<p className="text-white">Nenhum visitante inativo encontrado</p>
							</div>
						) : (
							<div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
								{inactiveVisitors.map((visitor) => (
									<div key={visitor.id} className="border-2 border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
										<div className="flex justify-between items-center">
											<div>
																									<p className="font-bold text-white text-lg">{visitor.name}</p>
													<p className="text-sm font-semibold text-white">CPF: {visitor.cpf}</p>
													<p className="text-sm font-semibold text-white">Sala: {visitor.salaDestino}</p>
													{visitor.email && (
														<p className="text-sm font-semibold text-white">Email: {visitor.email}</p>
													)}
												<p className="text-sm text-white">
													Check-in: {formatDate(visitor.checkIn)} | Check-out: {visitor.checkOut ? formatDate(visitor.checkOut) : 'N/A'}
												</p>
											</div>
											<div className="text-right">
												<div className="text-sm px-3 py-1 rounded-full font-bold text-white border-2 border-gray-300 mb-2">
													⚪ Inativo
												</div>
												<button
													onClick={() => handleDeleteVisitor(visitor.id)}
													disabled={deletingVisitor === visitor.id}
													className="border border-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:shadow-[0_0_10px_rgba(220,38,38,0.8)] shadow-md disabled:opacity-50 cursor-pointer"
												>
													{deletingVisitor === visitor.id ? "Excluindo..." : "Excluir"}
												</button>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				)}

				{/* Histórico completo de visitantes */}
				{showHistory && (
					<div className="mb-8 p-6 rounded-lg border border-purple-200">
						<div className="flex items-center justify-between mb-6">
							<h2 className="text-xl font-bold text-white">Histórico Completo de Visitantes</h2>
							<button
								onClick={loadHistory}
								disabled={loadingHistory}
								className="text-white hover:text-gray-300 transition-colors flex items-center gap-1 cursor-pointer"
							>
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
								</svg>
								{loadingHistory ? "Atualizando..." : "Atualizar"}
							</button>
						</div>

						{/* Estatísticas */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
							<div className="p-4 rounded-lg border border-purple-200 shadow-sm">
								<div className="text-2xl font-bold text-white">{historyStats.total}</div>
								<div className="text-sm text-white">Total de Registros</div>
							</div>
							<div className="p-4 rounded-lg border border-green-200 shadow-sm">
								<div className="text-2xl font-bold text-white">{historyStats.active}</div>
								<div className="text-sm text-white">Visitantes Ativos</div>
							</div>
							<div className="p-4 rounded-lg border border-blue-200 shadow-sm">
								<div className="text-2xl font-bold text-white">{historyStats.completed}</div>
								<div className="text-sm text-white">Checkouts Realizados</div>
							</div>
						</div>

						{loadingHistory ? (
							<div className="text-center py-8">
								<div className="text-white text-4xl mb-2">⏳</div>
								<p className="text-white">Carregando histórico...</p>
							</div>
						) : history.length === 0 ? (
							<div className="text-center py-8">
								<div className="text-white text-4xl mb-2"></div>
								<p className="text-white">Nenhum registro encontrado</p>
							</div>
						) : (
							<div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
								{history.map((entry) => (
									<div key={entry.id} className="border-2 border-purple-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
										<div className="flex justify-between items-start">
											<div className="flex-1">
												<div className="flex items-center gap-3 mb-2">
													<p className="font-bold text-white text-lg">{entry.name}</p>
													<span className={`text-xs px-2 py-1 rounded-full font-bold border-2 ${getHistoryStatusColor(entry.status)}`}>
														{entry.status === "Ativo" ? "🟢 Ativo" : "🔵 Checkout"}
													</span>
												</div>
												<div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
													<div>
														<p className="font-semibold text-white">CPF: {entry.cpf}</p>
														<p className="font-semibold text-white">Sala: {entry.salaDestino}</p>
														{entry.email && (
															<p className="font-semibold text-white">Email: {entry.email}</p>
														)}
													</div>
													<div>
														<p className="text-white">
															<span className="font-semibold">Check-in:</span> {formatDate(entry.checkIn)}
														</p>
														{entry.checkOut && (
															<p className="text-white">
																<span className="font-semibold">Check-out:</span> {formatDate(entry.checkOut)}
															</p>
														)}
														{entry.duration && (
															<p className="text-white">
																<span className="font-semibold">Duração:</span> {entry.duration} horas
															</p>
														)}
													</div>
												</div>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				)}

				{/* Logs do Sistema */}
				{showSystemLogs && (
					<div className="mb-8 p-6 rounded-lg border border-pink-200">
						<div className="flex items-center justify-between mb-6">
							<h2 className="text-xl font-bold text-white">Logs do Sistema</h2>
							<button
								onClick={() => loadSystemLogs()}
								disabled={loadingSystemLogs}
								className="text-white hover:text-gray-300 transition-colors flex items-center gap-1 cursor-pointer"
							>
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
								</svg>
								{loadingSystemLogs ? "Atualizando..." : "Atualizar"}
							</button>
						</div>

						{/* Estatísticas */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
							<div className="p-4 rounded-lg border border-pink-200 shadow-sm">
								<div className="text-2xl font-bold text-white">{systemLogsStats.total}</div>
								<div className="text-sm text-white">Total de Logs</div>
							</div>
							<div className="p-4 rounded-lg border border-pink-200 shadow-sm">
								<div className="text-2xl font-bold text-white">{systemLogs.length}</div>
								<div className="text-sm text-white">Logs Carregados</div>
							</div>
						</div>

						{loadingSystemLogs && systemLogs.length === 0 ? (
							<div className="text-center py-8">
								<div className="text-white text-4xl mb-2">⏳</div>
								<p className="text-white">Carregando logs...</p>
							</div>
						) : systemLogs.length === 0 ? (
							<div className="text-center py-8">
								<div className="text-white text-4xl mb-2"></div>
								<p className="text-white">Nenhum log encontrado</p>
							</div>
						) : (
							<div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
								{systemLogs.map((log) => (
									<div key={log.id} className="border-2 border-pink-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
										<div className="flex justify-between items-start">
											<div className="flex-1">
												<div className="flex items-center gap-3 mb-2">
													<p className="font-bold text-white text-lg">{log.userName}</p>
													<span className={`text-xs px-2 py-1 rounded-full font-bold border-2 ${getLogActionColor(log.action)}`}>
														{log.action.replace('_', ' ').toUpperCase()}
													</span>
												</div>
												<div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
													<div>
														<p className="font-semibold text-white">CPF: {log.userCpf}</p>
														<p className="font-semibold text-white">IP: {log.ipAddress || 'N/A'}</p>
														{log.targetName && (
															<p className="font-semibold text-white">Alvo: {log.targetName}</p>
														)}
													</div>
													<div>
														<p className="text-white">
															<span className="font-semibold">Data:</span> {formatDate(log.createdAt)}
														</p>
														<p className="text-white">
															<span className="font-semibold">Detalhes:</span> {log.details || 'N/A'}
														</p>
													</div>
												</div>
											</div>
										</div>
									</div>
								))}
							</div>
						)}

						{/* Botão para carregar mais */}
						{systemLogsStats.hasMore && (
							<div className="mt-4 text-center">
								<button
									onClick={() => loadSystemLogs(systemLogsStats.offset + systemLogsStats.limit)}
									disabled={loadingSystemLogs}
									className="border-2 border-[#6c91bf] text-white px-6 py-2 rounded-lg font-semibold hover:shadow-[0_0_15px_rgba(96,32,128,0.8)] transition-all duration-300 disabled:opacity-50 cursor-pointer"
								>
									{loadingSystemLogs ? "Carregando..." : "Carregar Mais"}
								</button>
							</div>
						)}
					</div>
				)}

				{/* Lista de visitantes ativos */}
				<div>
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-lg font-semibold text-white">Visitantes Ativos</h2>
						<div className="text-sm text-white">
							{activeVisitors.length} visitante{activeVisitors.length !== 1 ? 's' : ''} ativo{activeVisitors.length !== 1 ? 's' : ''}
						</div>
					</div>
					
					{activeVisitors.length === 0 ? (
						<div className="text-center py-12 rounded-lg">
							<div className="text-white text-6xl mb-4"></div>
							<p className="text-white text-lg">Nenhum visitante ativo no momento</p>
							<p className="text-white text-sm mt-2">Cadastre um novo visitante ou faça check-in de um existente</p>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{activeVisitors.map((visitor) => (
								<div key={visitor.id} className=" border border-[#6c91bf] rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
									<div className="flex items-start justify-between mb-3">
										<div className="flex-1">
											<h3 className="font-semibold text-lg text-white">{visitor.name}</h3>
											<p className="text-sm text-white">CPF: {visitor.cpf}</p>
										</div>
										<div className="flex items-center ml-3">
											<div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
											<span className="ml-2 text-xs font-medium text-green-400">ATIVO</span>
										</div>
									</div>
									
									<div className="space-y-2 mb-4">
										<div className="flex items-center">
											<span className="text-white text-sm mr-2">📍</span>
											<span className="text-sm font-medium text-white">{visitor.salaDestino}</span>
										</div>
										<div className="flex items-center">
											<span className="text-white text-sm mr-2">🕐</span>
											<span className="text-sm text-white">
												Check-in: {formatDate(visitor.checkIn)}
											</span>
										</div>
										{visitor.email && (
											<div className="flex items-center">
												<span className="text-white text-sm mr-2"></span>
												<span className="text-sm text-white">{visitor.email}</span>
											</div>
										)}
									</div>
									
									<div className="pt-3 border-t border-[#6c91bf]">
										<button
											onClick={() => handleCheckout(visitor.id)}
											className="w-full border-2 border-[#6c91bf] text-white py-2 px-3 rounded-md text-sm font-medium hover:shadow-[0_0_15px_rgba(96,32,128,0.8)] transition-all duration-300 cursor-pointer"
										>
											Fazer Checkout
										</button>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Estilos CSS para animação do toast */}
			<style jsx>{`
				@keyframes slide-in-right {
					from {
						transform: translateX(100%);
						opacity: 0;
					}
					to {
						transform: translateX(0);
						opacity: 1;
					}
				}
				
				.animate-slide-in-right {
					animation: slide-in-right 0.3s ease-out;
				}
			`}</style>
		</>
	);
}



