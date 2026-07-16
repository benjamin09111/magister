const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `API error: ${response.status}`);
  }

  return response.json();
}

export function getWebSocketUrl(endpoint: string): string {
  const base = API_BASE_URL.replace(/^http/, 'ws');
  return `${base}${endpoint}`;
}
