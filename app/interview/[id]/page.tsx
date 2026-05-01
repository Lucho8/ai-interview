"use client";

import { useState, useRef, useEffect, use } from "react";
import { Bot, Loader2 } from "lucide-react";
import {
  ChatHeader,
  MessageBubble,
  TypingIndicator,
  InputBar,
} from "@/app/page";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function InterviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [messages, setMessages] = useState<Message[]>([]);
  const [title, setTitle] = useState("");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(true);

  const [isFinished, setIsFinished] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/interview/${id}`);
        const data = await res.json();

        if (data.messages) {
          setMessages(data.messages);
          // 👇 2. Verificamos si en el historial ya habíamos pedido el feedback
          const lastUserMsg = [...data.messages]
            .reverse()
            .find((m) => m.role === "user");
          if (
            lastUserMsg &&
            lastUserMsg.content.includes("He terminado la entrevista")
          ) {
            setIsFinished(true);
          }
        }
        if (data.title) setTitle(data.title);
      } catch (err) {
        console.error("Error loading history:", err);
      } finally {
        setIsFetchingHistory(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail.id === id) setTitle(e.detail.newTitle);
    };
    window.addEventListener("titleUpdated", handler);
    return () => window.removeEventListener("titleUpdated", handler);
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    console.log("🚀 send() llamado con:", text.slice(0, 40));
    console.log("🚀 isLoading:", isLoading);
    if (!text.trim() || isLoading) {
      console.log("⛔ send() abortado — isLoading o text vacío");
      return;
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg], id }),
      });

      if (!res.ok) throw new Error("Failed");

      const botId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: botId, role: "assistant", content: "" },
      ]);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) => (m.id === botId ? { ...m, content: acc } : m)),
          );
        }

        console.log("🔍 reader existe?", !!reader);
        console.log(
          "🔍 text contiene trigger?",
          text.includes("He terminado la entrevista"),
        );

        if (text.includes("He terminado la entrevista")) {
          try {
            const memRes = await fetch("/api/memory", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                content: acc,
                type: "FEEDBACK",
                userId: "lucho_test_id",
              }),
            });

            if (!memRes.ok) {
              console.error(
                "El backend falló al guardar. Revisá la terminal de VS Code.",
              );
            } else {
              console.log(
                "¡Feedback vectorizado y guardado con éxito en Neon!",
              );
            }
          } catch (err) {
            console.error("Fallo al guardar la memoria:", err);
          }
        }
        // 👆 FIN DE LA MAGIA 👆
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Ocurrió un error. Por favor intentá de nuevo.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const handleFinishInterview = () => {
    setIsFinished(true);
    const feedbackPrompt =
      "He terminado la entrevista. Actúa como un Tech Lead evaluador. Haz un análisis estricto de mi desempeño en toda esta charla. Dame un reporte en Markdown que incluya estrictamente:\n\n- **Score Final:** (ej: 75/100)\n- **Puntos Fuertes:** (qué respondí bien)\n- **Áreas de Mejora:** (qué conceptos debo repasar)\n- **Conclusión:** (tu veredicto final)";
    send(feedbackPrompt);
  };

  if (isFetchingHistory) {
    return (
      <div className="relative z-10 flex flex-col h-screen items-center justify-center gap-4 text-muted">
        <div
          className="w-10 h-10 rounded-full bg-linear-to-br from-indigo-500 to-violet-500
                        flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.45)]
                        animate-pulse"
        >
          <Bot size={18} className="text-white" />
        </div>
        <span className="text-sm font-medium">Cargando entrevista…</span>
      </div>
    );
  }

  /* ── Chat view ── */
  return (
    <div className="relative z-10 flex flex-col h-screen max-w-3xl mx-auto w-full">
      <ChatHeader
        title={title || "Technical Interviewer"}
        onFinish={handleFinishInterview}
        isFinished={isFinished}
      />

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="flex flex-col gap-5">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="border-t border-white/5 bg-bg/90 backdrop-blur-md px-4 pt-3 pb-5">
        {isFinished ? (
          <div className="text-center text-sm text-indigo-300 py-3.5 bg-indigo-500/10 rounded-[18px] border border-indigo-500/20">
            Entrevista finalizada. Revisá tu feedback detallado arriba.
          </div>
        ) : (
          <InputBar
            input={input}
            setInput={setInput}
            isLoading={isLoading}
            onSubmit={handleSubmit}
            textareaRef={textareaRef}
          />
        )}
        <p className="text-center text-[11px] text-muted mt-2">
          AI puede cometer errores. Verificá las respuestas técnicas.
        </p>
      </footer>
    </div>
  );
}
