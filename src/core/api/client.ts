import axios from 'axios';
import { useAuthStore } from '../../modules/auth/store';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Para cookies seguros contendo Refresh Tokens
});

// Interceptor de Requisição para injetar o JWT
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Controle de Fila para Renovação Concorrente do Token
let isRefreshing = false;
let lastRefreshAttempt = 0;
let refreshFailCount = 0;
const MAX_REFRESH_FAILURES = 3;
const REFRESH_COOLDOWN_MS = 60_000; // 1 min de cooldown entre tentativas de refresh
let failedQueue: Array<{
  resolve: (value: string | null) => void;
  reject: (reason: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Interceptor de Resposta para tratar erros 401 e atualizar token automaticamente
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Se for erro 401 Unauthorized e ainda não tentamos repetir
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // 🔴 Se já estourou o limite de falhas consecutivas de refresh,
      //    não tenta mais — só rejeita. Evita loop infinito.
      if (refreshFailCount >= MAX_REFRESH_FAILURES) {
        return Promise.reject(error);
      }
      // Se já tentamos refresh recentemente, pula para evitar loop
      if (Date.now() - lastRefreshAttempt < REFRESH_COOLDOWN_MS) {
        return Promise.reject(error);
      }
      if (isRefreshing) {
        return new Promise<string | null>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Envia requisição para recriar o access token (usando cookie seguro no backend)
        const response = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { accessToken } = response.data;
        useAuthStore.getState().setAccessToken(accessToken);
        refreshFailCount = 0; // ✅ Reseta contador no refresh bem-sucedido

        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        
        return api(originalRequest);
      } catch (refreshError) {
        lastRefreshAttempt = Date.now();
        refreshFailCount++;
        processQueue(refreshError, null);
        // 🛑 NÃO chamamos logout() aqui para evitar que o PrivateRoute
        //    redirecione para /login e derrube toda a árvore React durante
        //    uma sessão de estudo ativa. A requisição original apenas falha
        //    silenciosamente e o usuário continua estudando.
        //    No fluxo normal (logout explícito), o handleLogout() no AppLayout
        //    cuida da limpeza do auth state e do cache.
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
