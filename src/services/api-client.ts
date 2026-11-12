export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

interface ApiEnvelope<T> {
  data?: T;
  error?: { code: string; message: string };
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const body: ApiEnvelope<T> = await response.json().catch(() => ({}));

  if (!response.ok || body.error) {
    const error = body.error ?? { code: "UNKNOWN_ERROR", message: "Something went wrong" };
    throw new ApiError(error.code, error.message, response.status);
  }

  if (body.data === undefined) {
    // A 2xx response whose body didn't parse into { data } (e.g. truncated by a
    // dev-server hot-reload mid-request) - fail loudly instead of silently handing
    // callers (TanStack Query in particular) an undefined value.
    throw new ApiError("MALFORMED_RESPONSE", "Received an unexpected empty response.", response.status);
  }

  return body.data;
}
