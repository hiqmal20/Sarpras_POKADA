import { io, Socket } from "socket.io-client";
import { API_BASE_URL, getAuthToken, setAuthToken, setRefreshToken, getRefreshToken } from "./api";

let socketInstance: Socket | null = null;
const joinedChatRooms = new Set<string>();

export const getSocketUrl = (): string => {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL.trim().replace(/\/+$/, "");
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/api\/?$/, "").replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && window.location.hostname) {
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    return `${protocol}//${window.location.hostname}:5000`;
  }
  return "http://localhost:5000";
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
  if (typeof window === "undefined" || typeof document === "undefined") return null;

  if (!socketInstance) {
    const socketUrl = getSocketUrl();
    socketInstance = io(socketUrl, {
      auth: (cb) => {
        const token = getAuthToken();
        cb({ token });
      },
      withCredentials: true,
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
        const storedRefreshToken = getRefreshToken();
        fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ refreshToken: storedRefreshToken || undefined }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data?.data?.token) {
              setAuthToken(data.data.token);
              if (data.data.refreshToken) setRefreshToken(data.data.refreshToken);
              if (socketInstance) {
                socketInstance.auth = { token: data.data.token };
                socketInstance.connect();
              }
            }
          })
          .catch(() => {});
      } else {
        console.warn("⚠️ WebSocket connection error:", err.message);
      }
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("🔌 WebSocket disconnected:", reason);
    });

    // Kirim heartbeat berkala agar status online tetap akurat
    window.setInterval(() => {
      if (socketInstance?.connected) socketInstance.emit("presence_heartbeat");
    }, 15000);
  } else if (socketInstance.disconnected) {
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

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (socketInstance) {
      socketInstance.disconnect();
    }
  });
}
