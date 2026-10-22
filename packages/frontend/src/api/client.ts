// packages/frontend/src/api/client.ts
// HTTP API Client - Seluruh request diarahkan strictly ke API Gateway (Port 3000)

const GATEWAY_BASE_URL = 'http://localhost:3000';

class ApiClient {
  private token: string | null = null;
  private deviceId: string | null = null;

  setCredentials(token: string | null, deviceId: string | null) {
    this.token = token;
    this.deviceId = deviceId;
  }

  getToken(): string | null {
    return this.token;
  }

  getDeviceId(): string | null {
    return this.deviceId;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${GATEWAY_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (this.deviceId) {
      headers['X-Device-ID'] = this.deviceId;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include' // Kirim cookie HttpOnly jika tersedia
    });

    // Tangani kemungkinan format response JSON atau text
    const contentType = response.headers.get('content-type') || '';
    let data: any;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { message: await response.text() };
    }

    if (!response.ok) {
      const errorMessage = data?.error || data?.message || `Permintaan gagal dengan status ${response.status}`;
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).data = data;
      throw error;
    }

    return data as T;
  }

  // Helper methods
  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
