import { io, Socket } from "socket.io-client";
import { getAuthToken } from "./api";

let socketInstance: Socket | null = null;
const joinedChatRooms = new Set<string>();

export const getSocketUrl = (): string => {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  if (typeof window !== "undefined" && window.location.hostname) {
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    return `${protocol}//${window.location.hostname}:5000`;
  }
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  return apiUrl.replace(/\/api\/?$/, "");
};

const rejoinChatRooms = (): void => {
  if (!socketInstance?.connected) return;
  joinedChatRooms.forEach((chatId) => {
    socketInstance?.emit("join_chat", chatId);
  });
};

export const joinChatRoom = (chatId: string): void => {
  if (!chatId) return;
  joinedChatRooms.add(chatId);
  const socket = getSocket();
  if (socket?.connected) {
    socket.emit("join_chat", chatId);
  }
};

export const leaveChatRoom = (chatId: string): void => {
  if (!chatId) return;
  joinedChatRooms.delete(chatId);
  if (socketInstance?.connected) {
    socketInstance.emit("leave_chat", chatId);
  }
};

export const getSocket = (): Socket | null => {
  if (typeof window === "undefined") return null;

  const token = getAuthToken();
  if (!token) {
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
      joinedChatRooms.clear();
    }
    return null;
  }

  // Jika token berubah (misal ganti akun admin/user), reset koneksi dengan token baru
  if (socketInstance) {
    const currentToken = (socketInstance.auth as any)?.token;
    if (currentToken && currentToken !== token) {
      socketInstance.disconnect();
      socketInstance = null;
    } else if (socketInstance.connected) {
      return socketInstance;
    }
  }

  if (!socketInstance) {
    const socketUrl = getSocketUrl();
    socketInstance = io(socketUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 600,
      reconnectionDelayMax: 4000,
    });

    socketInstance.on("connect", () => {
      console.log("⚡ WebSocket connected to server:", socketInstance?.id);
      rejoinChatRooms();
      window.dispatchEvent(new CustomEvent("socket-connected"));
    });

    socketInstance.on("connect_error", (err) => {
      if (err.message?.includes("Authentication error")) {
        console.warn("⚠️ WebSocket authentication warning:", err.message);
        // Coba perbarui token jika refreshToken tersedia
        const refreshToken = typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;
        if (refreshToken) {
          fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          })
            .then((r) => r.json())
            .then((d) => {
              if (d.status === "success" && d.data?.token) {
                localStorage.setItem("token", d.data.token);
                if (socketInstance) {
                  socketInstance.auth = { token: d.data.token };
                  socketInstance.connect();
                }
              }
            })
            .catch(() => {});
        }
      } else {
        console.warn("⚠️ WebSocket connection error:", err.message);
      }
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("🔌 WebSocket disconnected:", reason);
    });
  } else if (!socketInstance.connected) {
    socketInstance.auth = { token };
    socketInstance.connect();
  }

  return socketInstance;
};

export const disconnectSocket = (): void => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
  joinedChatRooms.clear();
};
