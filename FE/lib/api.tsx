import { supabase } from "./supabaseClient";

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

    getProfile: async () => {
      const res = await apiFetch<{ user: any }>("/auth/me", { method: "GET" });
      if (res.status === "success" && res.data?.user) return res;
      // Fallback directly to Supabase
      const local = getCurrentUser();
      if (local?.id) {
        const { data, error } = await supabase.from("users").select("*").eq("id", local.id).single();
        if (data && !error) {
          return { status: "success", message: "Profil dari Supabase", data: { user: data } };
        }
      }
      return res;
    },

    logout: () => {
      removeAuthToken();
      return apiFetch("/auth/logout", { method: "POST" });
    },
  },

  // 2. Users Module
  users: {
    getAll: async (params?: { role?: string; status?: string; search?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams(params as any).toString();
      const res = await apiFetch<any[]>(`/users${q ? `?${q}` : ""}`, { method: "GET" });
      if (res.status === "success" && Array.isArray(res.data) && res.data.length > 0) return res;

      // Direct Supabase query
      let query = supabase.from("users").select("*", { count: "exact" }).order("created_at", { ascending: false });
      if (params?.role && params.role !== "All Roles") query = query.ilike("role", `%${params.role}%`);
      if (params?.status) query = query.ilike("status", `%${params.status}%`);
      if (params?.search) {
        query = query.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%,nomor_induk.ilike.%${params.search}%`);
      }
      const { data, count, error } = await query;
      if (!error && data) {
        return { status: "success", message: "Data dari Supabase", data, total: count || data.length };
      }
      return res;
    },

    getById: async (id: string) => {
      const res = await apiFetch<any>(`/users/${id}`, { method: "GET" });
      if (res.status === "success" && res.data) return res;
      const { data, error } = await supabase.from("users").select("*").eq("id", id).single();
      if (!error && data) return { status: "success", message: "Data dari Supabase", data };
      return res;
    },

    create: async (payload: {
      nomor_induk: string;
      name: string;
      email: string;
      password?: string;
      role?: string;
      no_hp?: string;
      status?: string;
    }) => {
      const res = await apiFetch<any>("/users", { method: "POST", body: JSON.stringify(payload) });
      if (res.status === "success") return res;
      // Direct Supabase insert
      const insertPayload = {
        name: payload.name,
        email: payload.email,
        nomor_induk: payload.nomor_induk,
        role: payload.role || "Mahasiswa",
        no_hp: payload.no_hp || "",
        status: payload.status || "Aktif",
        created_at: new Date().toISOString(),
      };
      const { data, error } = await supabase.from("users").insert([insertPayload]).select().single();
      if (!error && data) return { status: "success", message: "User tersimpan di Supabase", data };
      return res;
    },

    update: async (id: string, payload: any) => {
      const res = await apiFetch<any>(`/users/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      if (res.status === "success") return res;
      const { data, error } = await supabase.from("users").update({ ...payload, update_at: new Date().toISOString() }).eq("id", id).select().single();
      if (!error && data) return { status: "success", message: "User diupdate di Supabase", data };
      return res;
    },

    uploadPhoto: async (id: string, file: File) => {
      try {
        const formData = new FormData();
        formData.append("photo", file);
        const token = getAuthToken();
        const res = await fetch(`${API_BASE_URL}/users/${id}/photo`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
        const data = await res.json();
        if (data.status === "success" && data.data?.foto) return data;
      } catch {}

      // Direct upload ke Supabase Storage
      try {
        const fileExt = file.name.split('.').pop() || 'png';
        const fileName = `${id}-${Date.now()}.${fileExt}`;
        const filePath = `profile-photos/${fileName}`;

        const { error: uploadErr } = await supabase.storage
          .from('sarpras-assets')
          .upload(filePath, file, { upsert: true, contentType: file.type });

        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('sarpras-assets').getPublicUrl(filePath);
          const photoUrl = urlData.publicUrl;
          await supabase.from('users').update({ foto: photoUrl, update_at: new Date().toISOString() }).eq('id', id);
          return { status: "success", message: "Foto profil berhasil disimpan di Supabase", data: { foto: photoUrl } };
        }
      } catch (err: any) {
        console.warn("Direct storage upload failed:", err);
      }

      return { status: "fail", message: "Gagal mengunggah foto" };
    },

    delete: async (id: string) => {
      const res = await apiFetch(`/users/${id}`, { method: "DELETE" });
      if (res.status === "success") return res;
      const { error } = await supabase.from("users").delete().eq("id", id);
      if (!error) return { status: "success", message: "User dihapus dari Supabase" };
      return res;
    },
  },

  // 3. Categories Module
  categories: {
    getAll: async () => {
      const res = await apiFetch<any[]>("/categories", { method: "GET" });
      if (res.status === "success" && Array.isArray(res.data) && res.data.length > 0) return res;

      const { data, error } = await supabase.from("categories").select("*").order("name", { ascending: true });
      if (!error && data) {
        return { status: "success", message: "Kategori dari Supabase", data, total: data.length };
      }
      return res;
    },

    getById: (id: string) =>
      apiFetch<any>(`/categories/${id}`, { method: "GET" }),

    create: async (payload: { name: string; description?: string }) => {
      const res = await apiFetch<any>("/categories", { method: "POST", body: JSON.stringify(payload) });
      if (res.status === "success") return res;
      const { data, error } = await supabase.from("categories").insert([payload]).select().single();
      if (!error && data) return { status: "success", message: "Kategori disimpan di Supabase", data };
      return res;
    },

    update: async (id: string, payload: { name?: string; description?: string }) => {
      const res = await apiFetch<any>(`/categories/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      if (res.status === "success") return res;
      const { data, error } = await supabase.from("categories").update(payload).eq("id", id).select().single();
      if (!error && data) return { status: "success", message: "Kategori diupdate di Supabase", data };
      return res;
    },

    delete: async (id: string) => {
      const res = await apiFetch(`/categories/${id}`, { method: "DELETE" });
      if (res.status === "success") return res;
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (!error) return { status: "success", message: "Kategori dihapus dari Supabase" };
      return res;
    },
  },

  // 4. Items Module
  items: {
    getAll: async (params?: {
      category_id?: string;
      search?: string;
      status?: string;
      page?: number;
      limit?: number;
    }) => {
      const q = new URLSearchParams(params as any).toString();
      const res = await apiFetch<any[]>(`/items${q ? `?${q}` : ""}`, { method: "GET" });
      if (res.status === "success" && Array.isArray(res.data) && res.data.length > 0) return res;

      let query = supabase.from("items").select("*, categories(*)", { count: "exact" }).order("created_at", { ascending: false });
      if (params?.category_id) query = query.eq("category_id", params.category_id);
      if (params?.status) query = query.eq("status", params.status);
      if (params?.search) query = query.or(`name.ilike.%${params.search}%,code.ilike.%${params.search}%`);

      const { data, count, error } = await query;
      if (!error && data) {
        return { status: "success", message: "Barang dari Supabase", data, total: count || data.length };
      }
      return res;
    },

    getById: async (id: string) => {
      const res = await apiFetch<any>(`/items/${id}`, { method: "GET" });
      if (res.status === "success" && res.data) return res;
      const { data, error } = await supabase.from("items").select("*, categories(*)").eq("id", id).single();
      if (!error && data) return { status: "success", message: "Barang dari Supabase", data };
      return res;
    },

    create: async (payload: any) => {
      const res = await apiFetch<any>("/items", { method: "POST", body: JSON.stringify(payload) });
      if (res.status === "success") return res;
      const insertPayload = {
        ...payload,
        created_at: new Date().toISOString(),
        update_at: new Date().toISOString(),
      };
      const { data, error } = await supabase.from("items").insert([insertPayload]).select("*, categories(*)").single();
      if (!error && data) return { status: "success", message: "Barang disimpan di Supabase", data };
      return res;
    },

    update: async (id: string, payload: any) => {
      const res = await apiFetch<any>(`/items/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      if (res.status === "success") return res;
      const { data, error } = await supabase.from("items").update({ ...payload, update_at: new Date().toISOString() }).eq("id", id).select("*, categories(*)").single();
      if (!error && data) return { status: "success", message: "Barang diupdate di Supabase", data };
      return res;
    },

    delete: async (id: string) => {
      const res = await apiFetch(`/items/${id}`, { method: "DELETE" });
      if (res.status === "success") return res;
      const { error } = await supabase.from("items").delete().eq("id", id);
      if (!error) return { status: "success", message: "Barang dihapus dari Supabase" };
      return res;
    },
  },

  // 5. Packages Module
  packages: {
    getAll: async () => {
      const res = await apiFetch<any[]>("/packages", { method: "GET" });
      if (res.status === "success" && Array.isArray(res.data) && res.data.length > 0) return res;

      const { data: pkgs, error } = await supabase.from("packages").select("*").order("created_at", { ascending: false });
      if (!error && pkgs) {
        const pkgIds = pkgs.map((p: any) => p.id);
        let itemsMap: Record<string, any[]> = {};
        if (pkgIds.length > 0) {
          const { data: pItems } = await supabase.from("packages_items").select("*, items(*)").in("package_id", pkgIds);
          if (pItems) {
            pItems.forEach((pi: any) => {
              if (!itemsMap[pi.package_id]) itemsMap[pi.package_id] = [];
              itemsMap[pi.package_id].push(pi);
            });
          }
        }
        const enriched = pkgs.map((p: any) => ({
          ...p,
          is_available: true,
          packages_items: itemsMap[p.id] || [],
        }));
        return { status: "success", message: "Paket dari Supabase", data: enriched, total: enriched.length };
      }
      return res;
    },

    getById: (id: string) =>
      apiFetch<any>(`/packages/${id}`, { method: "GET" }),

    create: async (payload: {
      name: string;
      description?: string;
      image_url?: string;
      status?: string;
      items: Array<{ item_id: string; quantity: number }>;
    }) => {
      const res = await apiFetch<any>("/packages", { method: "POST", body: JSON.stringify(payload) });
      if (res.status === "success") return res;

      // Supabase direct
      const { data: pkg, error: pErr } = await supabase.from("packages").insert([{
        name: payload.name,
        description: payload.description || "",
        image_url: payload.image_url || null,
        status: payload.status || "Aktif",
        created_at: new Date().toISOString(),
      }]).select().single();

      if (!pErr && pkg && payload.items?.length > 0) {
        const pkgItems = payload.items.map((i) => ({
          package_id: pkg.id,
          item_id: i.item_id,
          quantity: i.quantity,
        }));
        await supabase.from("packages_items").insert(pkgItems);
        return { status: "success", message: "Paket tersimpan di Supabase", data: pkg };
      }
      return res;
    },

    update: async (id: string, payload: any) => {
      const res = await apiFetch<any>(`/packages/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (res.status === "success") return res;

      const { data, error } = await supabase
        .from("packages")
        .update({
          name: payload.name,
          description: payload.description,
          image_url: payload.image_url,
          status: payload.status,
        })
        .eq("id", id)
        .select()
        .single();

      if (payload.items && payload.items.length > 0) {
        await supabase.from("packages_items").delete().eq("package_id", id);
        const pkgItems = payload.items.map((i: any) => ({
          package_id: id,
          item_id: i.item_id,
          quantity: i.quantity,
        }));
        await supabase.from("packages_items").insert(pkgItems);
      }
      if (!error && data) return { status: "success", message: "Paket diupdate di Supabase", data };
      return res;
    },

    delete: async (id: string) => {
      const res = await apiFetch(`/packages/${id}`, { method: "DELETE" });
      if (res.status === "success") return res;
      await supabase.from("packages_items").delete().eq("package_id", id);
      const { error } = await supabase.from("packages").delete().eq("id", id);
      if (!error) return { status: "success", message: "Paket dihapus dari Supabase" };
      return res;
    },
  },

  // 6. Borrowings Module
  borrowings: {
    getAll: async (params?: { status?: string; user_id?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams(params as any).toString();
      const res = await apiFetch<any[]>(`/borrowings${q ? `?${q}` : ""}`, { method: "GET" });
      if (res.status === "success" && Array.isArray(res.data) && res.data.length > 0) return res;

      let query = supabase.from("borrowings").select("*, users(*)", { count: "exact" }).order("created_at", { ascending: false });
      if (params?.status) query = query.ilike("status", `%${params.status}%`);

      const { data: bList, count, error } = await query;
      if (!error && bList) {
        const bIds = bList.map((b: any) => b.id);
        let bItemsMap: Record<string, any[]> = {};
        if (bIds.length > 0) {
          const { data: bItems } = await supabase.from("borrowings_items").select("*, items(*)").in("borrowing_id", bIds);
          if (bItems) {
            bItems.forEach((bi: any) => {
              if (!bItemsMap[bi.borrowing_id]) bItemsMap[bi.borrowing_id] = [];
              bItemsMap[bi.borrowing_id].push(bi);
            });
          }
        }
        const enriched = bList.map((b: any) => ({
          ...b,
          borrowings_items: bItemsMap[b.id] || [],
        }));
        return { status: "success", message: "Peminjaman dari Supabase", data: enriched, total: count || enriched.length };
      }
      return res;
    },

    getById: (id: string) =>
      apiFetch<any>(`/borrowings/${id}`, { method: "GET" }),

    create: (payload: any) =>
      apiFetch<any>("/borrowings", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    updateStatus: async (
      id: string,
      payload: { status: string; admin_notes?: string }
    ) => {
      const res = await apiFetch<any>(`/borrowings/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      if (res.status === "success") return res;
      const { data, error } = await supabase.from("borrowings").update({ status: payload.status, admin_note: payload.admin_notes }).eq("id", id).select().single();
      if (!error && data) return { status: "success", message: "Status diupdate di Supabase", data };
      return res;
    },
  },

  // 7. Returns Module
  returns: {
    getAll: async () => {
      const res = await apiFetch<any[]>("/returns", { method: "GET" });
      if (res.status === "success" && Array.isArray(res.data) && res.data.length > 0) return res;

      const { data, error } = await supabase.from("returns").select("*, borrowings(*, users(*))").order("created_at", { ascending: false });
      if (!error && data) return { status: "success", message: "Data pengembalian dari Supabase", data, total: data.length };
      return res;
    },

    getById: (id: string) =>
      apiFetch<any>(`/returns/${id}`, { method: "GET" }),

    create: async (payload: {
      borrowing_id: string;
      notes?: string;
    }) => {
      const res = await apiFetch<any>("/returns", { method: "POST", body: JSON.stringify(payload) });
      if (res.status === "success") return res;

      const { data, error } = await supabase.from("returns").insert([{
        borrowing_id: payload.borrowing_id,
        return_date: new Date().toISOString(),
        note: payload.notes || "",
        created_at: new Date().toISOString(),
      }]).select().single();

      await supabase.from("borrowings").update({ status: "Dikembalikan" }).eq("id", payload.borrowing_id);
      if (!error && data) return { status: "success", message: "Pengembalian tercatat di Supabase", data };
      return res;
    },
  },

  // 8. Damage Reports Module
  damageReports: {
    getAll: async (params?: { status?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams(params as any).toString();
      const res = await apiFetch<any[]>(`/damage-reports${q ? `?${q}` : ""}`, { method: "GET" });
      if (res.status === "success" && Array.isArray(res.data) && res.data.length > 0) return res;

      let query = supabase.from("damage_reports").select("*, users(*), items(*)", { count: "exact" }).order("created_at", { ascending: false });
      if (params?.status) query = query.ilike("status", `%${params.status}%`);

      const { data, count, error } = await query;
      if (!error && data) {
        return { status: "success", message: "Laporan kerusakan dari Supabase", data, total: count || data.length };
      }
      return res;
    },

    getById: (id: string) =>
      apiFetch<any>(`/damage-reports/${id}`, { method: "GET" }),

    create: async (payload: {
      borrowing_id?: string;
      item_id?: string;
      description: string;
      title?: string;
      damage_description?: string;
      photo_url?: string;
    }) => {
      const res = await apiFetch<any>("/damage-reports", { method: "POST", body: JSON.stringify(payload) });
      if (res.status === "success") return res;

      const user = getCurrentUser();
      const insertPayload = {
        user_id: user?.id || null,
        item_id: payload.item_id || null,
        borrowing_id: payload.borrowing_id || null,
        title: payload.title || "Laporan Kerusakan",
        description: payload.description || payload.damage_description || "",
        status: "Menunggu Review",
        created_at: new Date().toISOString(),
      };
      const { data, error } = await supabase.from("damage_reports").insert([insertPayload]).select("*, users(*), items(*)").single();
      if (!error && data) return { status: "success", message: "Laporan kerusakan tersimpan di Supabase", data };
      return res;
    },

    updateStatus: async (
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

      const res = await apiFetch<any>(`/damage-reports/${id}`, {
        method: "PATCH",
        body: JSON.stringify(bodyPayload),
      });
      if (res.status === "success") return res;

      // Supabase direct fallback
      const updateData: any = {};
      if (payload.status) updateData.status = payload.status;
      if (payload.admin_note || payload.admin_notes) updateData.admin_note = payload.admin_note || payload.admin_notes;
      if (payload.fine_amount !== undefined) updateData.fine_amount = Number(payload.fine_amount);
      if (payload.fine_reason !== undefined) updateData.fine_reason = payload.fine_reason;
      if (payload.fine_status) updateData.fine_status = payload.fine_status;
      updateData.update_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("damage_reports")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (!error && data) return { status: "success", message: "Status laporan diupdate di Supabase", data };
      return res;
    },
  },

  // 9. Chats Module
  chats: {
    getAll: async () => {
      const res = await apiFetch<any[]>("/chats", { method: "GET" });
      if (res.status === "success" && Array.isArray(res.data) && res.data.length > 0) return res;

      const { data, error } = await supabase.from("chats").select("*, user:users!chats_user_id_fkey(*)").order("updated_at", { ascending: false });
      if (!error && data) return { status: "success", message: "Chat dari Supabase", data, total: data.length };
      return res;
    },

    create: (payload: { subject?: string }) =>
      apiFetch<any>("/chats", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    getMessages: async (chatId: string) => {
      const res = await apiFetch<any[]>(`/chats/${chatId}/messages`, { method: "GET" });
      if (res.status === "success" && Array.isArray(res.data) && res.data.length > 0) return res;

      const { data, error } = await supabase.from("chat_messages").select("*, sender:users!chat_messages_sender_id_fkey(*)").eq("chat_id", chatId).order("created_at", { ascending: true });
      if (!error && data) return { status: "success", message: "Pesan dari Supabase", data };
      return res;
    },

    sendMessage: async (
      chatId: string,
      payload: { message: string; attachment_url?: string }
    ) => {
      const res = await apiFetch<any>(`/chats/${chatId}/messages`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (res.status === "success") return res;

      const user = getCurrentUser();
      const insertMsg = {
        chat_id: chatId,
        sender_id: user?.id,
        message: payload.message,
        created_at: new Date().toISOString(),
      };
      const { data, error } = await supabase.from("chat_messages").insert([insertMsg]).select().single();
      if (!error && data) return { status: "success", message: "Pesan tersimpan di Supabase", data };
      return res;
    },

    markAsRead: (chatId: string) =>
      apiFetch(`/chats/${chatId}/read`, { method: "PATCH" }),
  },

  // 10. Notifications Module
  notifications: {
    getAll: async () => {
      const res = await apiFetch<any[]>("/notifications", { method: "GET" });
      if (res.status === "success" && Array.isArray(res.data)) return res;

      const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(30);
      if (!error && data) return { status: "success", message: "Notifikasi dari Supabase", data };
      return res;
    },

    markAsRead: async (id: string) => {
      const res = await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
      if (res.status === "success") return res;
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      return { status: "success", message: "Notifikasi dibaca" };
    },

    markAllAsRead: async () => {
      const res = await apiFetch("/notifications/read-all", { method: "POST" });
      if (res.status === "success") return res;
      await supabase.from("notifications").update({ is_read: true }).neq("id", "0");
      return { status: "success", message: "Semua notifikasi dibaca" };
    },

    delete: async (id: string) => {
      const res = await apiFetch(`/notifications/${id}`, { method: "DELETE" });
      if (res.status === "success") return res;
      await supabase.from("notifications").delete().eq("id", id);
      return { status: "success", message: "Notifikasi dihapus" };
    },
  },

  // 11. Dashboard Module
  dashboard: {
    getStats: async () => {
      const res = await apiFetch<any>("/dashboard", { method: "GET" });
      if (res.status === "success" && res.data) return res;

      // Direct calculation from Supabase
      const [itemsRes, catRes, borrowRes, repRes, userRes, actRes] = await Promise.all([
        supabase.from("items").select("id, status, condition, stock, available_stock, category_id"),
        supabase.from("categories").select("id, name"),
        supabase.from("borrowings").select("id, status"),
        supabase.from("damage_reports").select("id, status"),
        supabase.from("users").select("id, status"),
        supabase.from("notifications").select("id, title, message, type, created_at").order("created_at", { ascending: false }).limit(6),
      ]);

      const items = itemsRes.data || [];
      const borrowings = borrowRes.data || [];
      const categories = catRes.data || [];

      const totalItemTypes = items.length;
      const totalUnits = items.reduce((acc, i) => acc + (Number(i.stock) || 0), 0);

      const activeDamageReportsCount = (repRes.data || []).filter((r) => r.status !== "Selesai").length;
      const damagedUnitsFromItems = items.filter((i) => i.condition !== "Baik").reduce((acc, i) => acc + (Number(i.stock) || 0), 0);
      const damagedUnits = Math.max(damagedUnitsFromItems, activeDamageReportsCount);

      const rawAvailable = items.reduce((acc, i) => acc + (Number(i.available_stock) || 0), 0);
      const availableUnits = Math.max(0, rawAvailable - (damagedUnitsFromItems === 0 && activeDamageReportsCount > 0 ? activeDamageReportsCount : 0));
      const borrowedUnits = items.reduce((acc, i) => acc + Math.max(0, (Number(i.stock) || 0) - (Number(i.available_stock) || 0)), 0);
      const maintenanceUnits = items.filter((i) => i.status === "Dalam Pemeliharaan").reduce((acc, i) => acc + (Number(i.stock) || 0), 0);

      const stats = {
        items: {
          total: totalUnits > 0 ? totalUnits : totalItemTypes,
          totalTypes: totalItemTypes,
          totalUnits,
          tersedia: availableUnits,
          dipinjam: borrowedUnits,
          dalamPemeliharaan: maintenanceUnits,
          rusak: damagedUnits,
        },
        categoryDistribution: categories.map((cat) => ({
          id: cat.id,
          name: cat.name,
          count: items.filter((i: any) => i.category_id === cat.id).length,
        })),
        borrowings: {
          aktif: borrowings.filter((b) => b.status === "Dipinjam").length,
          pending: borrowings.filter((b) => b.status === "Pending").length,
          terlambat: borrowings.filter((b) => b.status === "Terlambat").length,
          dikembalikan: borrowings.filter((b) => b.status === "Dikembalikan" || b.status === "Selesai").length,
        },
        laporanKerusakan: {
          menungguReview: (repRes.data || []).filter((r) => r.status === "Menunggu Review" || r.status === "Sedang Diperbaiki").length,
        },
        users: {
          totalAktif: (userRes.data || []).filter((u) => u.status === "Aktif").length,
        },
        recentActivities: actRes.data || [],
      };

      return { status: "success", message: "Statistik dari Supabase", data: stats };
    },
  },
};

export default api;
