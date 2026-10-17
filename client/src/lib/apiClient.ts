import axios from "axios";
import { getSession } from "next-auth/react";


const API_VERSION = process.env.NEXT_PUBLIC_API_URL_VERSION || "v1";

const getBaseUrl = () => {
  let envUrl: string;
  if (typeof window === "undefined") {
    envUrl = process.env.BACKEND_INTERNAL_URL || `http://backend:8000/api/${API_VERSION}`;
  } else {
    const raw = process.env.NEXT_PUBLIC_API_URL || `http://localhost:8000/api/${API_VERSION}`;
    const hostname = window.location.hostname;
    if (hostname && (hostname === "127.0.0.1" || hostname === "localhost")) {
      envUrl = raw.replace(/:\/\/(localhost|127\.0\.0\.1):/, `://${hostname}:`);
    } else {
      envUrl = raw;
    }
  }

  const trimmed = envUrl.trim().replace(/\/+$/, '');

  if (trimmed.endsWith(`/${API_VERSION}`)) {
    return trimmed;
  }

  if (trimmed.endsWith('/api')) {
    return `${trimmed}/${API_VERSION}`;
  }

  if (!trimmed.includes('/api')) {
    return `${trimmed}/api/${API_VERSION}`;
  }

  return `${trimmed}/${API_VERSION}`;
};

const API_URL = getBaseUrl();
export const API_BASE_URL = `${API_URL}`;
export const BACKEND_BASE = API_URL.replace(/\/api(\/.*)?$/, "");

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use(async (config) => {
  if (typeof window !== "undefined") {
    try {
      const session = await getSession();
      const token = (session as { accessToken?: string; user?: { accessToken?: string } } | null)?.accessToken ||
        (session as { accessToken?: string; user?: { accessToken?: string } } | null)?.user?.accessToken;
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // ignore
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    if (
      typeof window !== "undefined" &&
      error?.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      try {
        const session = await getSession();
        const token = (session as { accessToken?: string; user?: { accessToken?: string } } | null)?.accessToken ||
          (session as { accessToken?: string; user?: { accessToken?: string } } | null)?.user?.accessToken;
        if (token && originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }
      } catch {
        // let original error propagate
      }
    }
    return Promise.reject(error);
  }
);

export const getChartUrl = (urlPath: string) => {
  if (!urlPath) return "";
  if (urlPath.startsWith("http://") || urlPath.startsWith("https://")) {
    return urlPath;
  }
  return `${BACKEND_BASE}${urlPath.startsWith("/") ? "" : "/"}${urlPath}`;
};