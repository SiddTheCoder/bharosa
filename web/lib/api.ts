"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!(init.body instanceof FormData) && init.body) headers.set("Content-Type", "application/json");

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const detail = await res.text();
    throw new ApiError(res.status, detail || res.statusText);
  }
  return res.json() as Promise<T>;
}

export function apiGet<T>(path: string, token?: string | null) {
  return request<T>(path, { method: "GET" }, token);
}

export function apiPost<T>(path: string, body?: unknown, token?: string | null) {
  return request<T>(path, { method: "POST", body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }, token);
}

/** Fetch an authed binary resource (e.g. a private KYC image) as a blob object URL. */
export async function apiBlobUrl(path: string, token?: string | null): Promise<string> {
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) throw new ApiError(res.status, (await res.text()) || res.statusText);
  return URL.createObjectURL(await res.blob());
}

export { API_URL };
