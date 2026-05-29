import type { ApiResponse } from '../types/api';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
export const EXTERNAL_API_BASE_URL = import.meta.env.VITE_EXTERNAL_API_BASE_URL ?? '/external/v1';
export const DEV_USER_ID = import.meta.env.VITE_DEV_USER_ID ?? (import.meta.env.DEV ? '1' : undefined);

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

export interface DownloadedBlob {
  blob: Blob;
  fileName?: string;
}

export class OmsApiError extends Error {
  constructor(
    message: string,
    readonly response: ApiResponse<unknown>,
    readonly status: number,
  ) {
    super(message);
    this.name = 'OmsApiError';
  }
}

async function readApiResponse<TData>(response: Response): Promise<ApiResponse<TData>> {
  const text = await response.text();
  if (!text) {
    return {
      success: false,
      data: null,
      error: {
        code: `HTTP_${response.status}`,
        message: response.statusText || 'API response is empty.',
        details: [],
      },
      meta: {
        requestId: response.headers.get('X-Request-Id') ?? '',
        timestamp: new Date().toISOString(),
      },
    };
  }

  try {
    return JSON.parse(text) as ApiResponse<TData>;
  } catch {
    return {
      success: false,
      data: null,
      error: {
        code: `HTTP_${response.status}`,
        message: text.slice(0, 200) || response.statusText || 'API response is not JSON.',
        details: [],
      },
      meta: {
        requestId: response.headers.get('X-Request-Id') ?? '',
        timestamp: new Date().toISOString(),
      },
    };
  }
}

export async function apiClient<TData>(path: string, options: RequestOptions = {}): Promise<ApiResponse<TData>> {
  const headers = new Headers(options.headers);

  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (DEV_USER_ID && !headers.has('X-User-Id')) {
    headers.set('X-User-Id', DEV_USER_ID);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const payload = await readApiResponse<TData>(response);

  if (!response.ok) {
    throw new OmsApiError(payload.error?.message ?? 'API request failed', payload, response.status);
  }

  return payload;
}

export async function apiData<TData>(path: string, options: RequestOptions = {}): Promise<TData> {
  const response = await apiClient<TData>(path, options);
  if (!response.success || response.data === null) {
    throw new OmsApiError(response.error?.message ?? 'API response has no data.', response, 200);
  }
  return response.data;
}

export async function uploadMultipart<TData>(
  path: string,
  formData: FormData,
  options: Omit<RequestInit, 'body'> = {},
): Promise<TData> {
  const headers = new Headers(options.headers);
  if (DEV_USER_ID && !headers.has('X-User-Id')) {
    headers.set('X-User-Id', DEV_USER_ID);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method: options.method ?? 'POST',
    headers,
    body: formData,
  });
  const payload = await readApiResponse<TData>(response);

  if (!response.ok || !payload.success || payload.data === null) {
    throw new OmsApiError(payload.error?.message ?? 'Multipart request failed', payload, response.status);
  }

  return payload.data;
}

export async function downloadBlob(path: string, options: Omit<RequestInit, 'body'> = {}): Promise<DownloadedBlob> {
  const headers = new Headers(options.headers);
  if (DEV_USER_ID && !headers.has('X-User-Id')) {
    headers.set('X-User-Id', DEV_USER_ID);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const payload = await readApiResponse<unknown>(response);
    throw new OmsApiError(payload.error?.message ?? 'Download failed', payload, response.status);
  }

  return {
    blob: await response.blob(),
    fileName: parseContentDispositionFileName(response.headers.get('Content-Disposition')),
  };
}

export function buildQuery<TParams extends object>(params: TParams) {
  const query = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}

function parseContentDispositionFileName(value: string | null) {
  if (!value) {
    return undefined;
  }

  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].replace(/"/g, ''));
  }

  const plainMatch = value.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1];
}
