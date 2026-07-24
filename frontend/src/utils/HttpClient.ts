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
  const csrfToken = csrfCookie ? decodeURIComponent(csrfCookie.slice('csrf_token='.length)) : undefined;

  const headers = new Headers(init?.headers);
  if (csrfToken) headers.set('X-CSRF-Token', csrfToken);
  // Do not overwrite multipart boundaries or form-encoded requests.
  if (init?.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

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
