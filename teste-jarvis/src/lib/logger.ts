import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export interface LogAction {
  userId: string;
  userName: string;
  userCpf: string;
  action: string;
  details?: string;
  targetId?: string;
  targetName?: string;
  request?: NextRequest;
}

export async function logSystemAction(logData: LogAction) {
  try {
    // Extrair informações da requisição se fornecida
    let ipAddress: string | undefined;
    let userAgent: string | undefined;

    if (logData.request) {
      // Tentar obter IP de diferentes headers
      ipAddress = logData.request.headers.get('x-forwarded-for')?.split(',')[0] ||
                  logData.request.headers.get('x-real-ip') ||
                  logData.request.headers.get('cf-connecting-ip') ||
                  'unknown';
      
      userAgent = logData.request.headers.get('user-agent') || 'unknown';
    }

    // Criar log no banco de dados
    await prisma.systemLog.create({
      data: {
        userId: logData.userId,
        userName: logData.userName,
        userCpf: logData.userCpf,
        action: logData.action,
        details: logData.details,
        targetId: logData.targetId,
        targetName: logData.targetName,
        ipAddress,
        userAgent,
      },
    });

    console.log(`[SYSTEM LOG] ${logData.action} - ${logData.userName} (${logData.userCpf}) - ${logData.details || ''}`);
  } catch (error) {
    console.error('Erro ao registrar log do sistema:', error);
    // Não falhar a operação principal se o log falhar
  }
}

// Constantes para tipos de ações
export const LOG_ACTIONS = {
  // Autenticação
  LOGIN: 'login',
  LOGOUT: 'logout',
  REGISTER: 'register',
  
  // Visitantes
  CREATE_VISITOR: 'create_visitor',
  CHECKIN_VISITOR: 'checkin_visitor',
  CHECKOUT_VISITOR: 'checkout_visitor',
  DELETE_VISITOR: 'delete_visitor',
  SEARCH_VISITORS: 'search_visitors',
  VIEW_HISTORY: 'view_history',
  
  // Sistema
  	ACCESS_CONTROLE: 'access_controle',
  REFRESH_DATA: 'refresh_data',
} as const;

