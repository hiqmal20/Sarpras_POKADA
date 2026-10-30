export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export interface ApiResponse<T = any> {
  status: "success" | "fail" | "error";
  message: string;
  data?: T;
  total?: number;
  page?: number;
  limit?: number;
  unread_count?: number;
  errors?: Array<{ field: string; message: string }>;
}

export const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") || localStorage.getItem("access_token");
};

export const setAuthToken = (token: string): void => {
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("access_token", token);
      const isSecure = window.location.protocol === "https:";
      document.cookie = `access_token=${encodeURIComponent(token)}; path=/; max-age=86400; SameSite=Lax${isSecure ? "; Secure" : ""}`;
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("access_token");
      document.cookie = "access_token=; path=/; max-age=0; SameSite=Lax";
    }
  }
};

export const getRefreshToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refreshToken") || localStorage.getItem("refresh_token");
};

export const setRefreshToken = (refreshToken: string): void => {
  if (typeof window !== "undefined") {
    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("refresh_token", refreshToken);
      const isSecure = window.location.protocol === "https:";
      document.cookie = `refresh_token=${encodeURIComponent(refreshToken)}; path=/; max-age=${30 * 86400}; SameSite=Lax${isSecure ? "; Secure" : ""}`;
    } else {
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("refresh_token");
      document.cookie = "refresh_token=; path=/; max-age=0; SameSite=Lax";
    }
  }
};

export const removeAuthToken = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("refresh_token");
    document.cookie = "access_token=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "refresh_token=; path=/; max-age=0; SameSite=Lax";
  }
};

export const getCurrentUser = (): any | null => {
  if (typeof window === "undefined") return null;
  const user = localStorage.getItem("user");
  try {
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

export const setCurrentUser = (user: any): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem("user", JSON.stringify(user));
  }
};

// UI-only helper — never use for authorization. Server (BE) is source of truth.
export const isPrivilegedUser = (): boolean => {
  const r = getCurrentUser()?.role;
  return r === "Admin" || r === "Petugas";
};

function toQueryString(params?: Record<string, any>): string {
  if (!params) return "";
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      value !== "undefined" &&
      value !== "null"
    ) {
      clean[key] = String(value);
    }
  }
  const q = new URLSearchParams(clean).toString();
  return q ? `?${q}` : "";
}

let refreshPromise: Promise<boolean> | null = null;

async function performTokenRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const storedRefreshToken = getRefreshToken();
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ refreshToken: storedRefreshToken || undefined }),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        if (data.data?.token) {
          setAuthToken(data.data.token);
        }
        if (data.data?.refreshToken) {
          setRefreshToken(data.data.refreshToken);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });

    let data: ApiResponse<T>;
    try {
      data = await res.json();
    } catch {
      return {
        status: "error",
        message: `Server mengembalikan respons tidak valid (HTTP ${res.status})`,
      };
    }

    // Refresh token otomatis jika mendapat 401 dan bukan endpoint auth
    if (res.status === 401 && !isRetry && !endpoint.includes("/auth/")) {
      const refreshed = await performTokenRefresh();
      if (refreshed) {
        return apiFetch<T>(endpoint, options, true);
      }
    }

    if (!res.ok) {
      // Hanya redirect ke login jika 401 dan bukan pada halaman atau endpoint auth
      if (res.status === 401 && typeof window !== "undefined") {
        if (!endpoint.includes("/auth/")) {
          removeAuthToken();
          if (!window.location.pathname.startsWith("/auth/")) {
            window.location.href = "/auth/login";
          }
        }
      }
      return {
        ...data,
        status: data?.status && data.status !== "success" ? data.status : "error",
        message: data?.message || `Permintaan gagal (HTTP ${res.status})`,
      };
    }

    return data;
  } catch (error: any) {
    return {
      status: "error",
      message: error?.message || "Gagal menghubungi server",
    };
  }
}

// ── BE-only API client ──
// All data flows through Express backend (RBAC + Supabase service_role server-side).
// No direct Supabase calls from frontend, so no service_role/anon leakage in bundle.

export const api = {
  auth: {
    register: (payload: {
      nomor_induk: string;
      email: string;
      password: string;
      name: string;
      role?: string;
      no_hp?: string;
    }) =>
      apiFetch<{ user: any; token: string; refreshToken?: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    login: (payload: { email: string; nomor_induk: string; password: string }) =>
      apiFetch<{ user: any; token: string; refreshToken?: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    getProfile: () => apiFetch<{ user: any }>("/auth/me", { method: "GET" }),

    me: () => apiFetch<{ user: any }>("/auth/me", { method: "GET" }),

    updateProfile: (payload: {
      name?: string;
      email?: string;
      no_hp?: string;
      foto?: string;
      nomor_induk?: string;
    }) =>
      apiFetch<{ user: any }>("/auth/profile", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),

    changePassword: (payload: { currentPassword: string; newPassword: string }) =>
      apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    logout: async () => {
      const result = await apiFetch("/auth/logout", { method: "POST" });
      removeAuthToken();
      return result;
    },
  },

  users: {
    getAll: (params?: { role?: string; status?: string; search?: string; page?: number; limit?: number }) => {
      const q = toQueryString(params);
      return apiFetch<any[]>(`/users${q}`, { method: "GET" });
    },
    getById: (id: string) => apiFetch<any>(`/users/${id}`, { method: "GET" }),
    create: (payload: {
      nomor_induk: string;
      name: string;
      email: string;
      password?: string;
      role?: string;
      no_hp?: string;
      status?: string;
    }) => apiFetch<any>("/users", { method: "POST", body: JSON.stringify(payload) }),
    update: (id: string, payload: any) =>
      apiFetch<any>(`/users/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
    uploadPhoto: async (id: string, file: File) => {
      try {
        const formData = new FormData();
        formData.append("photo", file);
        const token = getAuthToken();
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(`${API_BASE_URL}/users/${id}/photo`, {
          method: "POST",
          headers,
          credentials: "include",
          body: formData,
        });
        return await res.json();
      } catch (e: any) {
        return { status: "fail", message: e?.message || "Gagal mengunggah foto" };
      }
    },
    delete: (id: string) => apiFetch(`/users/${id}`, { method: "DELETE" }),
    importCSV: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE_URL}/users/import`, {
        method: "POST",
        headers,
        credentials: "include",
        body: formData,
      });
      return await res.json();
    },
  },

  categories: {
    getAll: () => apiFetch<any[]>("/categories", { method: "GET" }),
    getById: (id: string) => apiFetch<any>(`/categories/${id}`, { method: "GET" }),
    create: (payload: { name: string; description?: string }) =>
      apiFetch<any>("/categories", { method: "POST", body: JSON.stringify(payload) }),
    update: (id: string, payload: { name?: string; description?: string }) =>
      apiFetch<any>(`/categories/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
    delete: (id: string) => apiFetch(`/categories/${id}`, { method: "DELETE" }),
  },

  items: {
    getAll: (params?: {
      category_id?: string;
      search?: string;
      status?: string;
      page?: number;
      limit?: number;
    }) => {
      const q = toQueryString(params);
      return apiFetch<any[]>(`/items${q}`, { method: "GET" });
    },
    getById: (id: string) => apiFetch<any>(`/items/${id}`, { method: "GET" }),
    create: (payload: any) =>
      apiFetch<any>("/items", { method: "POST", body: JSON.stringify(payload) }),
    update: (id: string, payload: any) =>
      apiFetch<any>(`/items/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
    delete: (id: string) => apiFetch(`/items/${id}`, { method: "DELETE" }),
  },

  packages: {
    getAll: () => apiFetch<any[]>("/packages", { method: "GET" }),
    getById: (id: string) => apiFetch<any>(`/packages/${id}`, { method: "GET" }),
    adjustStock: (id: string, payload: { action: "add" | "reduce"; quantity: number }) =>
      apiFetch<any>(`/packages/${id}/stock`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    create: (payload: {
      name: string;
      description?: string;
      image_url?: string;
      status?: string;
      items: Array<{ item_id?: string; code?: string; name?: string; quantity: number }>;
    }) => apiFetch<any>("/packages", { method: "POST", body: JSON.stringify(payload) }),
    update: (id: string, payload: any) =>
      apiFetch<any>(`/packages/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
    delete: (id: string) => apiFetch(`/packages/${id}`, { method: "DELETE" }),
    importCSV: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE_URL}/packages/import`, {
        method: "POST",
        headers,
        credentials: "include",
        body: formData,
      });
      return await res.json();
    },
  },

  borrowings: {
    getAll: (params?: { status?: string; user_id?: string; page?: number; limit?: number }) => {
      const q = toQueryString(params);
      return apiFetch<any[]>(`/borrowings${q}`, { method: "GET" });
    },
    getById: (id: string) => apiFetch<any>(`/borrowings/${id}`, { method: "GET" }),
    create: (payload: any) =>
      apiFetch<any>("/borrowings", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    updateStatus: (id: string, payload: { status: string; admin_notes?: string }) =>
      apiFetch<any>(`/borrowings/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
  },

  returnRequests: {
    getAll: (params?: { status?: string }) => {
      const q = toQueryString(params);
      return apiFetch<any[]>(`/return-requests${q}`, { method: "GET" });
    },
    create: (payload: { borrowing_id: string; planned_return_date: string; condition?: string; note?: string }) =>
      apiFetch<any>("/return-requests", { method: "POST", body: JSON.stringify(payload) }),
    updateStatus: (id: string, payload: { status: string; admin_note?: string }) =>
      apiFetch<any>(`/return-requests/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  },

  returns: {
    getAll: (params?: { limit?: number; page?: number }) => {
      const q = params ? toQueryString(params as any) : "";
      return apiFetch<any[]>(`/returns${q}`, { method: "GET" });
    },
    getById: (id: string) => apiFetch<any>(`/returns/${id}`, { method: "GET" }),
    create: (payload: {
      borrowing_id: string;
      note?: string;
      notes?: string;
      condition?: string;
    }) => {
      const normalized = {
        ...payload,
        note: payload.note || payload.notes || "",
        notes: payload.notes || payload.note || "",
      };
      return apiFetch<any>("/returns", { method: "POST", body: JSON.stringify(normalized) });
    },
  },

  damageReports: {
    getAll: (params?: { status?: string; fine_status?: string; page?: number; limit?: number }) => {
      const q = toQueryString(params);
      return apiFetch<any[]>(`/damage-reports${q}`, { method: "GET" });
    },
    getById: (id: string) => apiFetch<any>(`/damage-reports/${id}`, { method: "GET" }),
    create: (payload: {
      user_id?: string;
      borrowing_id?: string;
      item_id?: string;
      package_id?: string;
      title?: string;
      description?: string;
      report_type?: string;
      damage_type?: string;
      item_condition?: string;
      fine_amount?: number;
      fine_reason?: string;
      damage_description?: string;
      photo_url?: string;
      image_url?: string;
    }) => apiFetch<any>("/damage-reports", { method: "POST", body: JSON.stringify(payload) }),
    updateStatus: (
      id: string,
      payload: {
        status?: string;
        admin_notes?: string;
        admin_note?: string;
        fine_amount?: number;
        fine_reason?: string;
        fine_status?: string;
      }
    ) => {
      const bodyPayload = {
        ...payload,
        admin_note: payload.admin_note || payload.admin_notes || "",
      };
      return apiFetch<any>(`/damage-reports/${id}`, {
        method: "PATCH",
        body: JSON.stringify(bodyPayload),
      });
    },
  },

  chats: {
    getAll: () => apiFetch<any[]>("/chats", { method: "GET" }),
    create: (payload: { subject?: string; initial_message?: string; admin_id?: string; user_id?: string }) =>
      apiFetch<any>("/chats", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    getMessages: (chatId: string) =>
      apiFetch<any[]>(`/chats/${chatId}/messages`, { method: "GET" }),
    sendMessage: (chatId: string, payload: { message: string; attachment_url?: string; reply_to_message_id?: string | null }) =>
      apiFetch<any>(`/chats/${chatId}/messages`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    markAsRead: (chatId: string) => apiFetch(`/chats/${chatId}/read`, { method: "PATCH" }),
    clearMessages: (chatId: string) => apiFetch(`/chats/${chatId}/messages`, { method: "DELETE" }),
    updateMessage: (chatId: string, messageId: string, message: string) =>
      apiFetch(`/chats/${chatId}/messages/${messageId}`, {
        method: "PATCH",
        body: JSON.stringify({ message }),
      }),
    deleteMessage: (chatId: string, messageId: string) =>
      apiFetch(`/chats/${chatId}/messages/${messageId}`, { method: "DELETE" }),
    updateStatus: (chatId: string, status: "Open" | "Closed") =>
      apiFetch(`/chats/${chatId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    deleteChat: (chatId: string) => apiFetch(`/chats/${chatId}`, { method: "DELETE" }),
  },

  notifications: {
    getAll: () => apiFetch<any[]>("/notifications", { method: "GET" }),
    markAsRead: (id: string) => apiFetch(`/notifications/${id}/read`, { method: "PATCH" }),
    markAllAsRead: () => apiFetch("/notifications/read-all", { method: "POST" }),
    delete: (id: string) => apiFetch(`/notifications/${id}`, { method: "DELETE" }),
  },

  dashboard: {
    getStats: () => apiFetch<any>("/dashboard/stats", { method: "GET" }),
  },
};

export default api;
