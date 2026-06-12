// src/utils/HttpClient.ts
/**
 * Centralized HTTP client that automatically includes credentials, CSRF token header,
 * and performs JSON response handling. Throws an error for non‑2xx responses.
 */
export async function httpRequest<T = any>(input: RequestInfo, init?: RequestInit): Promise<T> {
  // Extract CSRF token from cookie (name assumed to be 'csrf_token')
  const csrfCookie = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf_token='));
  const csrfToken = csrfCookie ? csrfCookie.split('=')[1] : undefined;

  const headers: HeadersInit = {
    ...(init?.headers || {}),
    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    'Content-Type': 'application/json',
  };

  const response = await fetch(input, {
    ...init,
    credentials: 'include', // always include cookies
    headers,
  });

  if (!response.ok) {
    // Attempt to parse JSON error body
    let errorDetail: any = {};
    try {
      errorDetail = await response.json();
    } catch (_) {
      // ignore parsing errors
    }
    const error = new Error(errorDetail.detail || response.statusText);
    (error as any).status = response.status;
    (error as any).data = errorDetail;
    throw error;
  }

  // Return parsed JSON (or empty object for 204 No Content)
  if (response.status === 204) {
    return {} as T;
  }
  return (await response.json()) as T;
}
