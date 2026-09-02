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
  return localStorage.getItem("token");
};

export const setAuthToken = (token: string): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem("token", token);
  }
};

export const removeAuthToken = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
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

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const token = getAuthToken();
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data: ApiResponse<T> = await res.json();
    return data;
  } catch (error: any) {
    return {
      status: "error",
      message: error?.message || "Gagal menghubungi server",
    };
  }
}

export const api = {
  // 1. Auth Module
  auth: {
    register: (payload: {
      nomor_induk: string;
      email: string;
      password: string;
      name: string;
      role?: string;
      no_hp?: string;
    }) =>
      apiFetch<{ user: any; token: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    login: (payload: { email: string; nomor_induk: string; password: string }) =>
      apiFetch<{ user: any; token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    getProfile: () => apiFetch<{ user: any }>("/auth/me", { method: "GET" }),

    logout: () => {
      removeAuthToken();
      return apiFetch("/auth/logout", { method: "POST" });
    },
  },

  // 2. Users Module
  users: {
    getAll: (params?: { role?: string; status?: string; search?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams(params as any).toString();
      return apiFetch<any[]>(`/users${q ? `?${q}` : ""}`, { method: "GET" });
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
    }) =>
      apiFetch<any>("/users", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: any) =>
      apiFetch<any>(`/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    delete: (id: string) =>
      apiFetch(`/users/${id}`, { method: "DELETE" }),
  },

  // 3. Categories Module
  categories: {
    getAll: () => apiFetch<any[]>("/categories", { method: "GET" }),
    getById: (id: string) =>
      apiFetch<any>(`/categories/${id}`, { method: "GET" }),
    create: (payload: { name: string; description?: string }) =>
      apiFetch<any>("/categories", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: { name?: string; description?: string }) =>
      apiFetch<any>(`/categories/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    delete: (id: string) =>
      apiFetch(`/categories/${id}`, { method: "DELETE" }),
  },

  // 4. Items Module
  items: {
    getAll: (params?: {
      category_id?: string;
      search?: string;
      status?: string;
      page?: number;
      limit?: number;
    }) => {
      const q = new URLSearchParams(params as any).toString();
      return apiFetch<any[]>(`/items${q ? `?${q}` : ""}`, { method: "GET" });
    },
    getById: (id: string) =>
      apiFetch<any>(`/items/${id}`, { method: "GET" }),
    create: (payload: any) =>
      apiFetch<any>("/items", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: any) =>
      apiFetch<any>(`/items/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    delete: (id: string) =>
      apiFetch(`/items/${id}`, { method: "DELETE" }),
  },

  // 5. Packages Module
  packages: {
    getAll: () => apiFetch<any[]>("/packages", { method: "GET" }),
    getById: (id: string) =>
      apiFetch<any>(`/packages/${id}`, { method: "GET" }),
    create: (payload: {
      name: string;
      description?: string;
      items: Array<{ item_id: string; quantity: number }>;
    }) =>
      apiFetch<any>("/packages", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: any) =>
      apiFetch<any>(`/packages/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    delete: (id: string) =>
      apiFetch(`/packages/${id}`, { method: "DELETE" }),
  },

  // 6. Borrowings Module
  borrowings: {
    getAll: (params?: { status?: string; user_id?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams(params as any).toString();
      return apiFetch<any[]>(`/borrowings${q ? `?${q}` : ""}`, { method: "GET" });
    },
    getById: (id: string) =>
      apiFetch<any>(`/borrowings/${id}`, { method: "GET" }),
    create: (payload: {
      borrow_date: string;
      return_date: string;
      purpose: string;
      items: Array<{ item_id: string; quantity: number }>;
    }) =>
      apiFetch<any>("/borrowings", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    updateStatus: (
      id: string,
      payload: { status: string; admin_notes?: string }
    ) =>
      apiFetch<any>(`/borrowings/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
  },

  // 7. Returns Module
  returns: {
    getAll: () => apiFetch<any[]>("/returns", { method: "GET" }),
    getById: (id: string) =>
      apiFetch<any>(`/returns/${id}`, { method: "GET" }),
    create: (payload: {
      borrowing_id: string;
      returned_items?: Array<{ item_id: string; condition: string }>;
      notes?: string;
    }) =>
      apiFetch<any>("/returns", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },

  // 8. Damage Reports Module
  damageReports: {
    getAll: (params?: { status?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams(params as any).toString();
      return apiFetch<any[]>(`/damage-reports${q ? `?${q}` : ""}`, { method: "GET" });
    },
    getById: (id: string) =>
      apiFetch<any>(`/damage-reports/${id}`, { method: "GET" }),
    create: (payload: {
      borrowing_id?: string;
      item_id?: string;
      description: string;
      photo_url?: string;
    }) =>
      apiFetch<any>("/damage-reports", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    updateStatus: (
      id: string,
      payload: { status: string; admin_notes?: string }
    ) =>
      apiFetch<any>(`/damage-reports/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
  },

  // 9. Chats Module
  chats: {
    getAll: () => apiFetch<any[]>("/chats", { method: "GET" }),
    create: (payload: { subject?: string }) =>
      apiFetch<any>("/chats", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    getMessages: (chatId: string) =>
      apiFetch<any[]>(`/chats/${chatId}/messages`, { method: "GET" }),
    sendMessage: (
      chatId: string,
      payload: { message: string; attachment_url?: string }
    ) =>
      apiFetch<any>(`/chats/${chatId}/messages`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    markAsRead: (chatId: string) =>
      apiFetch(`/chats/${chatId}/read`, { method: "PATCH" }),
  },

  // 10. Notifications Module
  notifications: {
    getAll: () => apiFetch<any[]>("/notifications", { method: "GET" }),
    markAsRead: (id: string) =>
      apiFetch(`/notifications/${id}/read`, { method: "PATCH" }),
    markAllAsRead: () =>
      apiFetch("/notifications/read-all", { method: "POST" }),
    delete: (id: string) =>
      apiFetch(`/notifications/${id}`, { method: "DELETE" }),
  },

  // 11. Dashboard Module
  dashboard: {
    getStats: () => apiFetch<any>("/dashboard", { method: "GET" }),
  },
};

export default api;
