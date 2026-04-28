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
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

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
      "Quiero practicar una entrevista técnica de Frontend (React, CSS, HTML).",
  },
  {
    icon: Brain,
    label: "Algoritmos",
    prompt:
      "Quiero practicar preguntas sobre estructuras de datos y algoritmos.",
  },
  {
    icon: Zap,
    label: "System Design",
    prompt: "Quiero practicar System Design para una entrevista senior.",
  },
  {
    icon: MessageSquare,
    label: "Soft skills",
    prompt: "Quiero practicar preguntas conductuales y de soft skills.",
  },
];

const INITIAL_MSG: Message = {
  id: "1",
  role: "assistant",
  content:
    "Hello! I'm your AI Interviewer. I'll be asking you technical questions about your experience. Ready to begin?",
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MSG]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [interviewId, setInterviewId] = useState<string | null>(null);

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

  /* ──────── Welcome screen ──────── */
  if (!started) {
    return (
      <div className="relative z-10 flex flex-col h-screen items-center justify-between">
        <div className="ambient-glow" />

        {/* Greeting */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <span className="fade-up-1 text-xs font-medium tracking-widest uppercase text-muted mb-3">
            AI Technical Interviewer
          </span>

          <h1 className="gradient-heading fade-up-2 text-5xl font-bold leading-tight mb-4">
            Hola, ¿listo para
            <br />
            practicar?
          </h1>

          <p className="fade-up-3 text-base text-muted max-w-sm leading-relaxed">
            Simulá entrevistas técnicas reales. Elegí un tema o escribí lo que
            quieras.
          </p>
        </div>

        {/* Bottom zone */}
        <div className="fade-up-4 w-full max-w-2xl px-4 pb-8">
          {/* Quick start chips */}
          <div className="flex flex-wrap gap-2 justify-center mb-4">
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

  /* ──────── Chat view ──────── */
  return (
    <div className="relative z-10 flex flex-col h-screen max-w-3xl mx-auto w-full">
      <ChatHeader title="Technical Interviewer" />

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
        <InputBar
          input={input}
          setInput={setInput}
          isLoading={isLoading}
          onSubmit={handleSubmit}
          textareaRef={textareaRef}
        />
        <p className="text-center text-[11px] text-muted mt-2">
          AI puede cometer errores. Verificá las respuestas técnicas.
        </p>
      </footer>
    </div>
  );
}

/* ── Shared sub-components ── */

export function ChatHeader({ title }: { title: string }) {
  return (
    <header
      className="sticky top-0 z-10 flex items-center justify-between px-6 py-3.5
                       border-b border-white/5 bg-bg/85 backdrop-blur-xl"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-full bg-linear-to-br from-indigo-500 to-violet-500
                        flex items-center justify-center text-[13px] font-bold text-white
                        shadow-[0_0_16px_rgba(99,102,241,0.4)]"
        >
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
      <span
        className="hidden sm:block text-[11px] font-medium tracking-wider uppercase
                       text-muted bg-card border border-white/8 rounded-full px-3 py-1"
      >
        Software Dev
      </span>
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
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || "");
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={vscDarkPlus as any}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{
                      borderRadius: 8,
                      margin: "8px 0",
                      fontSize: 13,
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                    {...props}
                  >
                    {String(children).replace(/\n$/, "")}
                  </SyntaxHighlighter>
                ) : (
                  <code
                    className="bg-indigo-500/12 text-indigo-300 px-1.5 py-0.5 rounded text-[0.87em] font-mono"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              p: ({ children }) => <p className="my-1.5">{children}</p>,
              ul: ({ children }) => <ul className="my-1.5 pl-5">{children}</ul>,
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
