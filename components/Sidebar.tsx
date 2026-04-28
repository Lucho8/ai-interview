"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { MessageSquare, Plus, Trash2, Edit3, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import { Show, SignInButton, UserButton, SignIn } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";

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
      if (localData) {
        setChats(JSON.parse(localData));
      } else {
        setChats([]);
      }
    }
  };

  useEffect(() => {
    if (isLoaded) {
      loadChats();
    }

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

    if (isLoaded && user) {
      syncChats();
    }
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

        if (params.id === id) {
          router.push("/");
        }
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
            detail: { id: id, newTitle: editTitle },
          }),
        );
      }
    } catch (err) {
      console.error("Error al renombrar:", err);
    }
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen">
      <div className="p-4">
        <div className="p-4 border-t border-slate-800">
          <Show when="signed-out">
            <div className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 px-4 rounded-lg transition-colors text-center font-medium">
              <SignInButton mode="modal">Iniciar Sesión</SignInButton>
            </div>
          </Show>

          <Show when="signed-in">
            <div className="flex items-center gap-3 px-2">
              <UserButton />
              <span className="text-sm font-medium text-slate-300">
                Mi Perfil
              </span>
            </div>
          </Show>
        </div>
        <a
          href="/"
          className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg transition-colors font-medium"
        >
          <Plus size={18} /> Nueva Entrevista
        </a>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <p className="text-xs font-semibold text-slate-500 uppercase px-3 py-2 text-center">
          Historial
        </p>

        {chats.map((chat) => (
          <div key={chat.id} className="group relative">
            {editingId === chat.id ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-md">
                <input
                  autoFocus
                  className="bg-transparent border-none text-sm text-white focus:ring-0 w-full"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
                <button onClick={(e) => handleRename(e, chat.id)}>
                  <Check size={14} className="text-green-500" />
                </button>
                <button onClick={() => setEditingId(null)}>
                  <X size={14} className="text-red-500" />
                </button>
              </div>
            ) : (
              <Link
                href={`/interview/${chat.id}`}
                className={`flex items-center justify-between gap-3 px-3 py-2 rounded-md transition-colors text-sm ${params.id === chat.id ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <MessageSquare size={16} className="shrink-0" />
                  <span className="truncate">
                    {chat.title || `Sesión ${chat.id.slice(-4)}`}
                  </span>
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => startEditing(e, chat)}
                    className="p-1 hover:text-indigo-400"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, chat.id)}
                    className="p-1 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </Link>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
