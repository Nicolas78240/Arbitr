import { useAuthStore } from './auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const REQUEST_TIMEOUT_MS = 30_000;

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

class ApiClient {
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const { accessToken } = useAuthStore.getState();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      let response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      if (response.status === 401 && accessToken) {
        const refreshed = await this.tryRefresh();
        if (refreshed) {
          const { accessToken: newToken } = useAuthStore.getState();
          headers['Authorization'] = `Bearer ${newToken}`;
          response = await fetch(`${API_URL}${path}`, { ...options, headers, signal: controller.signal });
        }
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: 'UNKNOWN',
          message: response.statusText,
          statusCode: response.status
        }));
        throw error;
      }

      // Handle 204 No Content
      if (response.status === 204) return undefined as T;
      return response.json();
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw { error: 'TIMEOUT', message: 'La requête a expiré. Veuillez réessayer.', statusCode: 408 } as ApiError;
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async tryRefresh(): Promise<boolean> {
    const { refreshToken, setTokens, logout } = useAuthStore.getState();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) {
        logout();
        return false;
      }
      const tokens = await response.json();
      setTokens(tokens.accessToken, tokens.refreshToken);
      return true;
    } catch {
      logout();
      return false;
    }
  }

  get<T>(path: string) {
    return this.request<T>(path);
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  delete<T>(path: string) {
    return this.request<T>(path, {
      method: 'DELETE'
    });
  }
}

export const api = new ApiClient();