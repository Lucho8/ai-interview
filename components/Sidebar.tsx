"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams, usePathname } from "next/navigation";
import {
  MessageSquare,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  LayoutDashboard,
} from "lucide-react";
import toast from "react-hot-toast";
import { Show, SignInButton, UserButton, useUser } from "@clerk/nextjs";

interface ChatEntry {
  id: string;
  date: string;
  title?: string;
}

export default function Sidebar() {
  const [chats, setChats] = useState<ChatEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const { user, isLoaded } = useUser();

  const loadChats = async () => {
    if (user) {
      try {
        const res = await fetch("/api/interviews");
        if (res.ok) {
          const dbChats = await res.json();
          setChats(dbChats);
        }
      } catch (error) {
        console.error("Error trayendo chats de la DB:", error);
      }
    } else {
      const localData = localStorage.getItem("interview_chats");
      setChats(localData ? JSON.parse(localData) : []);
    }
  };

  useEffect(() => {
    if (isLoaded) loadChats();
    window.addEventListener("newChatSaved", loadChats);
    return () => window.removeEventListener("newChatSaved", loadChats);
  }, [user, isLoaded]);

  useEffect(() => {
    const syncChats = async () => {
      const localData = localStorage.getItem("interview_chats");
      if (!localData || !user) return;
      const chats = JSON.parse(localData);
      const chatIds = chats.map((c: any) => c.id);
      if (chatIds.length > 0) {
        try {
          const res = await fetch("/api/sync", {
            method: "POST",
            body: JSON.stringify({ chatIds }),
          });
          if (res.ok) {
            localStorage.removeItem("interview_chats");
            window.location.reload();
          }
        } catch (err) {
          console.error("Error sincronizando chats:", err);
        }
      }
    };
    if (isLoaded && user) syncChats();
  }, [user, isLoaded]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("¿Estás seguro de que querés borrar esta entrevista?")) return;
    try {
      const res = await fetch(`/api/interview/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("¡Entrevista eliminada!");
        const updated = chats.filter((c) => c.id !== id);
        localStorage.setItem(
          "interview_chats",
          JSON.stringify([...updated].reverse()),
        );
        setChats(updated);
        if (params.id === id) router.push("/");
      }
    } catch (err) {
      console.error("Error al borrar:", err);
    }
  };

  const startEditing = (e: React.MouseEvent, chat: ChatEntry) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(chat.id);
    setEditTitle(chat.title || `Sesión ${chat.id.slice(-4)}`);
  };

  const handleRename = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(`/api/interview/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle }),
      });
      if (res.ok) {
        toast.success("¡Nombre actualizado!");
        const updated = chats.map((c) =>
          c.id === id ? { ...c, title: editTitle } : c,
        );
        localStorage.setItem(
          "interview_chats",
          JSON.stringify([...updated].reverse()),
        );
        setChats(updated);
        setEditingId(null);
        window.dispatchEvent(
          new CustomEvent("titleUpdated", {
            detail: { id, newTitle: editTitle },
          }),
        );
      }
    } catch (err) {
      console.error("Error al renombrar:", err);
    }
  };

  return (
    <aside
      className="relative w-64 flex flex-col h-screen overflow-hidden border-r border-white/5"
      style={{ background: "var(--color-surface)" }}
    >
      <div
        className="pointer-events-none absolute -top-10 -left-10 w-48 h-48 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5 mb-5">
          <div
            className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold text-white"
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              boxShadow: "0 0 14px rgba(99,102,241,0.35)",
            }}
          >
            AI
          </div>
          <div>
            <p
              className="text-sm font-semibold leading-tight"
              style={{ color: "var(--color-fg)" }}
            >
              Interviewer
            </p>
            <p
              className="text-[10px] uppercase tracking-widest"
              style={{ color: "var(--color-muted)" }}
            >
              Practice Mode
            </p>
          </div>
        </div>

        <a
          href="/"
          className="group flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:shadow-[0_0_18px_rgba(99,102,241,0.35)]"
          style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            boxShadow: "0 0 10px rgba(99,102,241,0.2)",
          }}
        >
          <Plus
            size={16}
            className="transition-transform duration-200 group-hover:rotate-90"
          />
          Nueva Entrevista
        </a>
      </div>

      {/* Divider */}
      <div className="mx-5 border-t border-white/5" />

      <div className="px-3 pt-3 pb-1">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest px-2 py-1.5 mb-1"
          style={{ color: "var(--color-muted)" }}
        >
          Menú
        </p>

        <Show when="signed-in">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group/dash"
            style={{
              background:
                pathname === "/dashboard"
                  ? "rgba(99,102,241,0.10)"
                  : "transparent",
              color:
                pathname === "/dashboard"
                  ? "var(--color-fg)"
                  : "var(--color-muted)",
              borderLeft:
                pathname === "/dashboard"
                  ? "2px solid rgba(99,102,241,0.6)"
                  : "2px solid transparent",
            }}
            onMouseEnter={(e) => {
              if (pathname !== "/dashboard") {
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(255,255,255,0.03)";
                (e.currentTarget as HTMLElement).style.color =
                  "var(--color-fg)";
              }
            }}
            onMouseLeave={(e) => {
              if (pathname !== "/dashboard") {
                (e.currentTarget as HTMLElement).style.background =
                  "transparent";
                (e.currentTarget as HTMLElement).style.color =
                  "var(--color-muted)";
              }
            }}
          >
            <LayoutDashboard
              size={16}
              style={{
                color:
                  pathname === "/dashboard"
                    ? "rgb(129,140,248)"
                    : "currentColor",
              }}
            />
            Tu Progreso
          </Link>
        </Show>

        <Show when="signed-out">
          <div
            className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium cursor-not-allowed opacity-60"
            style={{
              color: "var(--color-muted)",
              borderLeft: "2px solid transparent",
            }}
            title="Iniciá sesión para ver tus estadísticas"
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard size={16} />
              Tu Progreso
            </div>
            <span className="text-[9px] uppercase tracking-wider bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded">
              Pro
            </span>
          </div>
        </Show>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-1">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest px-2 py-2"
          style={{ color: "var(--color-muted)" }}
        >
          Historial
        </p>

        <div className="space-y-0.5">
          {chats.length === 0 && (
            <p
              className="text-xs text-center py-8 leading-relaxed"
              style={{ color: "var(--color-muted)" }}
            >
              No hay entrevistas aún.
              <br />
              ¡Empezá una nueva!
            </p>
          )}

          {chats.map((chat) => {
            const isActive = params.id === chat.id;
            const label = chat.title || `Sesión ${chat.id.slice(-4)}`;

            return (
              <div key={chat.id} className="group relative">
                {editingId === chat.id ? (
                  /* ── Inline rename ── */
                  <div
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-indigo-500/40"
                    style={{ background: "var(--color-card)" }}
                  >
                    <input
                      autoFocus
                      className="bg-transparent border-none outline-none text-xs w-full font-sans"
                      style={{ color: "var(--color-fg)" }}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(e as any, chat.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                    <button
                      onClick={(e) => handleRename(e, chat.id)}
                      className="p-0.5 rounded hover:opacity-80 transition-opacity"
                    >
                      <Check size={13} className="text-green-400" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-0.5 rounded hover:opacity-80 transition-opacity"
                    >
                      <X size={13} className="text-red-400" />
                    </button>
                  </div>
                ) : (
                  /* ── Chat row ── */
                  <Link
                    href={`/interview/${chat.id}`}
                    className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-xs transition-all duration-150 group/link"
                    style={{
                      background: isActive
                        ? "rgba(99,102,241,0.10)"
                        : "transparent",
                      color: isActive
                        ? "var(--color-fg)"
                        : "var(--color-muted)",
                      borderLeft: isActive
                        ? "2px solid rgba(99,102,241,0.6)"
                        : "2px solid transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background =
                          "rgba(255,255,255,0.03)";
                        (e.currentTarget as HTMLElement).style.color =
                          "var(--color-fg)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background =
                          "transparent";
                        (e.currentTarget as HTMLElement).style.color =
                          "var(--color-muted)";
                      }
                    }}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                      <MessageSquare
                        size={13}
                        className="shrink-0"
                        style={{
                          color: isActive
                            ? "rgb(129,140,248)"
                            : "var(--color-muted)",
                        }}
                      />
                      <span className="truncate leading-snug">{label}</span>
                    </div>

                    {/* Action buttons — visible on hover */}
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
                      <button
                        onClick={(e) => startEditing(e, chat)}
                        className="p-1 rounded-md transition-colors duration-150 hover:bg-indigo-500/20 hover:text-indigo-400"
                        style={{ color: "var(--color-muted)" }}
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, chat.id)}
                        className="p-1 rounded-md transition-colors duration-150 hover:bg-red-500/20 hover:text-red-400"
                        style={{ color: "var(--color-muted)" }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mx-5 border-t border-white/5" />

      <div className="px-4 py-4">
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button
              className="w-full py-2 px-4 rounded-xl text-xs font-semibold border border-white/10 transition-all duration-200 hover:border-indigo-500/40 hover:bg-indigo-500/8"
              style={{
                color: "var(--color-fg)",
                background: "var(--color-card)",
              }}
            >
              Iniciar Sesión
            </button>
          </SignInButton>
        </Show>

        <Show when="signed-in">
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/5"
            style={{ background: "var(--color-card)" }}
          >
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-7 h-7",
                },
              }}
            />
            <div className="min-w-0">
              <p
                className="text-xs font-medium truncate leading-tight"
                style={{ color: "var(--color-fg)" }}
              >
                {user?.firstName ?? "Mi Perfil"}
              </p>
              <p
                className="text-[10px]"
                style={{ color: "var(--color-muted)" }}
              >
                Cuenta activa
              </p>
            </div>
          </div>
        </Show>
      </div>
    </aside>
  );
}
