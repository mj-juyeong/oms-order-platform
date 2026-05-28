import type { ApiResponse } from '../types/api';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

export async function apiClient<TData>(path: string, options: RequestOptions = {}): Promise<ApiResponse<TData>> {
  const headers = new Headers(options.headers);

  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const payload = (await response.json()) as ApiResponse<TData>;

  if (!response.ok) {
    throw payload;
  }

  return payload;
}
