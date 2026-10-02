"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export interface ToastItem {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title?: string;
  message: string;
  duration?: number;
}

type ToastListener = (toasts: ToastItem[]) => void;
let activeToasts: ToastItem[] = [];
const listeners = new Set<ToastListener>();

function notify() {
  listeners.forEach((listener) => listener([...activeToasts]));
}

export const toast = {
  show: (type: ToastItem["type"], message: string, title?: string, duration = 4500) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newToast: ToastItem = { id, type, message, title, duration };
    activeToasts = [newToast, ...activeToasts].slice(0, 5);
    notify();

    if (duration > 0) {
      setTimeout(() => {
        toast.dismiss(id);
      }, duration);
    }
    return id;
  },
  success: (message: string, title?: string, duration?: number) =>
    toast.show("success", message, title, duration),
  error: (message: string, title?: string, duration?: number) =>
    toast.show("error", message, title, duration),
  warning: (message: string, title?: string, duration?: number) =>
    toast.show("warning", message, title, duration),
  info: (message: string, title?: string, duration?: number) =>
    toast.show("info", message, title, duration),
  dismiss: (id: string) => {
    activeToasts = activeToasts.filter((t) => t.id !== id);
    notify();
  },
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    listeners.add(setToasts);
    setToasts([...activeToasts]);
    return () => {
      listeners.delete(setToasts);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0">
      {toasts.map((t) => {
        const isSuccess = t.type === "success";
        const isError = t.type === "error";
        const isWarning = t.type === "warning";
        const isInfo = t.type === "info";

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-3 duration-200 ${
              isSuccess
                ? "bg-emerald-50/95 border-emerald-200/90 text-emerald-900 shadow-emerald-950/5"
                : isError
                ? "bg-rose-50/95 border-rose-200/90 text-rose-900 shadow-rose-950/5"
                : isWarning
                ? "bg-amber-50/95 border-amber-200/90 text-amber-900 shadow-amber-950/5"
                : "bg-sky-50/95 border-sky-200/90 text-sky-900 shadow-sky-950/5"
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {isError && <AlertCircle className="w-5 h-5 text-rose-600" />}
              {isWarning && <AlertTriangle className="w-5 h-5 text-amber-600" />}
              {isInfo && <Info className="w-5 h-5 text-[#0785BC]" />}
            </div>

            <div className="flex-1 min-w-0">
              {t.title && (
                <h4 className="text-xs font-bold leading-snug mb-0.5 tracking-tight">
                  {t.title}
                </h4>
              )}
              <p className="text-[12px] leading-relaxed break-words opacity-90 font-medium">
                {t.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => toast.dismiss(t.id)}
              className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-black/5 transition-colors cursor-pointer"
              title="Tutup pemberitahuan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
