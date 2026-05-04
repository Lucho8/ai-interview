"use client";

import { useState, useRef, useEffect } from "react";
import {
  SendHorizontal,
  Loader2,
  Bot,
  User,
  Code2,
  Brain,
  Zap,
  MessageSquare,
  Settings2,
  FileText,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { CodeBlock } from "@/components/CodeBlock";
import toast from "react-hot-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const QUICK_STARTS = [
  {
    icon: Code2,
    label: "Frontend",
    prompt:
      "Quiero practicar una entrevista técnica de Frontend. Antes de empezar, haceme UNA sola pregunta a la vez para entender: qué tecnologías manejo (React, Vue, CSS, etc.), mi nivel de experiencia, y si hay algún tema específico que quiera reforzar. Cuando tengas suficiente contexto, avisame y arrancá con la entrevista.",
  },
  {
    icon: Brain,
    label: "Algoritmos",
    prompt:
      "Quiero practicar algoritmos y estructuras de datos. Antes de empezar, haceme UNA sola pregunta a la vez para entender: mi nivel (junior, mid, senior), con qué lenguaje prefiero resolver los ejercicios, y si hay alguna estructura o tema específico que quiera trabajar (árboles, grafos, ordenamiento, etc.). Cuando tengas suficiente contexto, avisame y arrancá.",
  },
  {
    icon: Zap,
    label: "System Design",
    prompt:
      "Quiero practicar System Design. Antes de empezar, haceme UNA sola pregunta a la vez para entender: mi nivel de seniority, con qué tipo de sistemas tengo experiencia, y si hay algún componente específico que quiera practicar (bases de datos, caching, escalabilidad, etc.). Cuando tengas suficiente contexto, avisame y arrancá con el ejercicio.",
  },
  {
    icon: MessageSquare,
    label: "Soft Skills",
    prompt:
      "Quiero practicar preguntas conductuales y de soft skills. Antes de empezar, haceme UNA sola pregunta a la vez para entender: a qué tipo de empresa o rol estoy aplicando, si tengo alguna situación difícil que quiera aprender a comunicar mejor, y qué nivel de seniority estoy buscando. Cuando tengas suficiente contexto, avisame y arrancá.",
  },
];

const INITIAL_MSG: Message = {
  id: "1",
  role: "assistant",
  content:
    "Hola! Soy tu entrevistador técnico de IA. Puedo simular entrevistas para ayudarte a practicar. Elige un tema o hazme una pregunta para empezar.",
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MSG]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [interviewId, setInterviewId] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [config, setConfig] = useState({
    role: "Fullstack Developer",
    seniority: "Mid-Level",
    topic: "",
  });

  const [isFinished, setIsFinished] = useState(false);

  const [isUploadingCv, setIsUploadingCv] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;
    if (!started) setStarted(true);

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
        body: JSON.stringify({
          messages: [...messages, userMsg],
          id: interviewId ?? undefined,
        }),
      });

      const newId = res.headers.get("X-Interview-Id");
      if (newId && !interviewId) {
        setInterviewId(newId);
        const history = JSON.parse(
          localStorage.getItem("interview_chats") ?? "[]",
        );
        history.push({ id: newId, date: new Date().toISOString() });
        localStorage.setItem("interview_chats", JSON.stringify(history));
        window.dispatchEvent(new Event("newChatSaved"));
        window.history.replaceState(null, "", `/interview/${newId}`);
      }

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

        if (text.includes("He terminado la entrevista")) {
          try {
            const memRes = await fetch("/api/memory", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                content: acc,
                type: "FEEDBACK",
              }),
            });
            if (memRes.ok) {
              console.log(
                "¡Feedback vectorizado y guardado con éxito desde la página de inicio! 🚀",
              );
            } else {
              console.error("El backend falló al guardar el RAG.");
            }
          } catch (err) {
            console.error("Fallo al guardar la memoria:", err);
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const handleStartCustomInterview = () => {
    setIsModalOpen(false);
    const customPrompt = `Quiero practicar una entrevista técnica para el rol de ${config.role}, nivel ${config.seniority}, centrado en ${config.topic || "tecnologías generales"}.`;
    send(customPrompt);
  };

  const handleFinishInterview = () => {
    setIsFinished(true);
    const feedbackPrompt =
      "He terminado la entrevista. Actúa como un Tech Lead evaluador. Haz un análisis estricto de mi desempeño en toda esta charla. Dame un reporte en Markdown que incluya estrictamente:\n\n- **Score Final:** (ej: 75/100)\n- **Puntos Fuertes:** (qué respondí bien)\n- **Áreas de Mejora:** (qué conceptos debo repasar)\n- **Conclusión:** (tu veredicto final)";
    send(feedbackPrompt);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCv(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const cvRes = await fetch("/api/cv", {
        method: "POST",
        body: formData,
      });
      const cvData = await cvRes.json();

      if (!cvRes.ok) {
        throw new Error(cvData.error || "Fallo al procesar el CV");
      }

      await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: cvData.analysis,
          type: "CV",
        }),
      });

      const promptArranque =
        "Acabo de subir mi CV. Por favor, asume el rol de un entrevistador técnico estricto. Revisa mi perfil y comencemos la entrevista haciéndome preguntas incisivas sobre las tecnologías, experiencias y posibles puntos débiles que encuentres en mi currículum.";
      send(promptArranque);
    } catch (err: any) {
      console.error("Error procesando CV:", err);
      // 2. Mostramos el toast con el mensaje exacto
      toast.error(err.message || "Ocurrió un error inesperado al leer el CV.");

      // IMPORTANTE: si tenés algún estado de "isLoading" o "isUploading",
      // acordate de pasarlo a false acá para que el botón se destrabe.
      // setIsUploading(false);
    } finally {
      setIsUploadingCv(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!started) {
    return (
      <div className="relative z-10 flex flex-col h-screen items-center justify-between">
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card border border-white/10 p-6 rounded-3xl w-full max-w-md shadow-[0_0_40px_rgba(99,102,241,0.15)]">
              <h2 className="text-xl font-semibold text-fg mb-1">
                Configurar Entrevista
              </h2>
              <p className="text-sm text-muted mb-6">
                Personalizá tu simulacro a medida.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] text-muted mb-1.5 ml-1">
                    Rol a evaluar
                  </label>
                  <select
                    className="w-full bg-white/5 border border-white/10 text-fg rounded-xl p-3 focus:ring-1 focus:ring-indigo-500/50 outline-none text-sm transition-all"
                    value={config.role}
                    onChange={(e) =>
                      setConfig({ ...config, role: e.target.value })
                    }
                  >
                    <option className="bg-slate-900">Frontend Developer</option>
                    <option className="bg-slate-900">Backend Developer</option>
                    <option className="bg-slate-900">
                      Fullstack Developer
                    </option>
                    <option className="bg-slate-900">Data Scientist</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[13px] text-muted mb-1.5 ml-1">
                    Seniority
                  </label>
                  <select
                    className="w-full bg-white/5 border border-white/10 text-fg rounded-xl p-3 focus:ring-1 focus:ring-indigo-500/50 outline-none text-sm transition-all"
                    value={config.seniority}
                    onChange={(e) =>
                      setConfig({ ...config, seniority: e.target.value })
                    }
                  >
                    <option className="bg-slate-900">Junior</option>
                    <option className="bg-slate-900">Mid-Level</option>
                    <option className="bg-slate-900">Senior</option>
                    <option className="bg-slate-900">Lead</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[13px] text-muted mb-1.5 ml-1">
                    Tecnología Principal
                  </label>
                  <input
                    type="text"
                    className="w-full bg-white/5 border border-white/10 text-fg rounded-xl p-3 focus:ring-1 focus:ring-indigo-500/50 outline-none text-sm placeholder-white/20 transition-all"
                    placeholder="Ej: React, Python, AWS..."
                    value={config.topic}
                    onChange={(e) =>
                      setConfig({ ...config, topic: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-fg text-sm font-medium transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleStartCustomInterview}
                  className="flex-1 py-2.5 rounded-xl bg-linear-to-br from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white text-sm font-medium shadow-[0_0_16px_rgba(99,102,241,0.4)] transition-all cursor-pointer"
                >
                  Comenzar
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="ambient-glow" />

        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <span className="fade-up-1 text-xs font-medium tracking-widest uppercase text-muted mb-3">
            AI Technical Interviewer
          </span>

          <h1 className="gradient-heading fade-up-2 text-5xl font-bold leading-tight mb-4">
            Hola, ¿listo para practicar?
          </h1>

          <p className="fade-up-3 text-base text-muted max-w-sm leading-relaxed">
            Simulá entrevistas técnicas reales. Elegí un tema o escribí lo que
            quieras.
          </p>
        </div>

        <div className="fade-up-4 w-full max-w-2xl px-4 pb-8">
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingCv}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                         bg-emerald-500/10 border border-emerald-500/30 text-emerald-300
                         hover:bg-emerald-500/20 hover:border-emerald-400/50 hover:shadow-[0_0_12px_rgba(16,185,129,0.2)]
                         transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploadingCv ? (
                <Loader2 size={14} className="spin" />
              ) : (
                <FileText size={14} />
              )}
              {isUploadingCv ? "Analizando CV..." : "Entrevista por CV (PDF)"}
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                         bg-indigo-500/10 border border-indigo-500/30 text-indigo-300
                         hover:bg-indigo-500/20 hover:border-indigo-400/50 hover:shadow-[0_0_12px_rgba(99,102,241,0.2)]
                         transition-all duration-200 cursor-pointer"
            >
              <Settings2 size={14} />
              Configurar Entrevista
            </button>

            {QUICK_STARTS.map(({ icon: Icon, label, prompt }) => (
              <button
                key={label}
                onClick={() => send(prompt)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                           bg-card border border-white/10 text-muted
                           hover:border-indigo-500/50 hover:text-fg hover:bg-indigo-500/8
                           transition-all duration-200 cursor-pointer"
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          <InputBar
            input={input}
            setInput={setInput}
            isLoading={isLoading}
            onSubmit={handleSubmit}
            textareaRef={textareaRef}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 flex flex-col h-screen max-w-3xl mx-auto w-full">
      <ChatHeader
        title="Technical Interviewer"
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

export function ChatHeader({
  title,
  onFinish,
  isFinished,
}: {
  title: string;
  onFinish?: () => void;
  isFinished?: boolean;
}) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-3.5 border-b border-white/5 bg-bg/85 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-linear-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-[13px] font-bold text-white shadow-[0_0_16px_rgba(99,102,241,0.4)]">
          AI
        </div>
        <div>
          <p className="text-sm font-semibold text-fg leading-tight truncate max-w-65">
            {title}
          </p>
          <p className="text-[11px] text-green-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            Online
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onFinish && !isFinished && (
          <button
            onClick={onFinish}
            className="text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20 rounded-full px-3 py-1 hover:bg-red-500/20 transition-colors cursor-pointer"
          >
            Finalizar Entrevista
          </button>
        )}

        <span className="hidden sm:block text-[11px] font-medium tracking-wider uppercase text-muted bg-card border border-white/8 rounded-full px-3 py-1">
          Software Dev
        </span>
      </div>
    </header>
  );
}

export function AvatarAI() {
  return (
    <div
      className="w-8 h-8 rounded-full shrink-0 bg-linear-to-br from-indigo-500 to-violet-500
                    flex items-center justify-center shadow-[0_0_10px_rgba(99,102,241,0.35)]"
    >
      <Bot size={15} className="text-white" />
    </div>
  );
}

export function AvatarUser() {
  return (
    <div
      className="w-8 h-8 rounded-full shrink-0 bg-indigo-500/15 border border-indigo-400/35
                    flex items-center justify-center"
    >
      <User size={15} className="text-indigo-400" />
    </div>
  );
}

export function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";

  return (
    <div
      className={`msg-in flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {isUser ? <AvatarUser /> : <AvatarAI />}

      <div
        className={`max-w-[80%] px-4 py-3 text-sm leading-[1.7] text-fg
        ${
          isUser
            ? "bg-indigo-500/14 border border-indigo-400/30 rounded-[18px_4px_18px_18px]"
            : "bg-card border border-white/7 rounded-[4px_18px_18px_18px]"
        }`}
      >
        {isUser ? (
          <span>{msg.content}</span>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code: CodeBlock,

              p: ({ children }) => <p className="my-1.5">{children}</p>,
              ul: ({ children }) => (
                <ul className="my-1.5 pl-5 list-disc">{children}</ul>
              ),
              li: ({ children }) => <li className="mb-1">{children}</li>,
              strong: ({ children }) => (
                <strong className="font-semibold text-indigo-300">
                  {children}
                </strong>
              ),
            }}
          >
            {msg.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="msg-in flex items-start gap-3">
      <AvatarAI />
      <div className="bg-card border border-white/7 rounded-[4px_18px_18px_18px] px-4 py-3.5 flex gap-1.5 items-center">
        <span className="w-2 h-2 rounded-full bg-indigo-500 dot-1 inline-block" />
        <span className="w-2 h-2 rounded-full bg-indigo-500 dot-2 inline-block" />
        <span className="w-2 h-2 rounded-full bg-indigo-500 dot-3 inline-block" />
      </div>
    </div>
  );
}

export function InputBar({
  input,
  setInput,
  isLoading,
  onSubmit,
  textareaRef,
}: {
  input: string;
  setInput: (v: string) => void;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const [focused, setFocused] = useState(false);
  const active = Boolean(input.trim()) && !isLoading;

  return (
    <form
      onSubmit={onSubmit}
      className={`flex items-end gap-2 bg-card rounded-[18px] px-4 py-2.5 transition-all duration-200
        ${
          focused
            ? "border border-indigo-500/45 shadow-[0_0_0_3px_rgba(99,102,241,0.10),0_4px_24px_rgba(0,0,0,0.3)]"
            : "border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
        }`}
    >
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (input.trim()) onSubmit(e as unknown as React.FormEvent);
          }
        }}
        placeholder="Escribí tu respuesta o preguntá algo..."
        rows={1}
        disabled={isLoading}
        className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-fg
                   placeholder-muted leading-[1.6] min-h-6 max-h-40 overflow-y-auto font-sans"
      />
      <button
        type="submit"
        disabled={!active}
        className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center transition-all duration-200
          ${
            active
              ? "bg-linear-to-br from-indigo-500 to-violet-500 shadow-[0_0_12px_rgba(99,102,241,0.4)] cursor-pointer"
              : "bg-white/5 cursor-not-allowed"
          }`}
      >
        {isLoading ? (
          <Loader2 size={16} className="text-muted spin" />
        ) : (
          <SendHorizontal
            size={16}
            className={active ? "text-white" : "text-muted"}
          />
        )}
      </button>
    </form>
  );
}
