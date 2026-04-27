"use client";

import { useState, useRef, useEffect } from "react";
import { SendHorizontal, Loader2, User, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I'm your AI Interviewer. I'll be asking you technical questions about your experience. Ready to begin?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [interviewId, setInterviewId] = useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          id: interviewId || undefined,
        }),
      });

      const serverInterviewId = response.headers.get("X-Interview-Id");

      if (serverInterviewId && !interviewId) {
        setInterviewId(serverInterviewId);
        const pastChats = JSON.parse(
          localStorage.getItem("interview_chats") || "[]",
        );
        pastChats.push({
          id: serverInterviewId,
          date: new Date().toISOString(),
        });
        localStorage.setItem("interview_chats", JSON.stringify(pastChats));
        window.dispatchEvent(new Event("newChatSaved"));
        window.history.replaceState(
          null,
          "",
          `/interview/${serverInterviewId}`,
        );
      } else if (!interviewId) {
        console.warn("No interview ID received from server");
      }

      if (!response.ok) throw new Error("Failed to get response");

      const botMsgId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: botMsgId, role: "assistant", content: "" },
      ]);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let botText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          botText += decoder.decode(value, { stream: true });

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMsgId ? { ...msg, content: botText } : msg,
            ),
          );
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto border-x border-slate-800 bg-slate-950 shadow-2xl">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
            AI
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-100">
              Technical Interviewer
            </h1>
            <p className="text-xs text-green-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Online
            </p>
          </div>
        </div>
        <div className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full">
          Software Dev Role
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
          >
            <div
              className={`flex max-w-[80%] gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === "user" ? "bg-indigo-600" : "bg-slate-700"
                }`}
              >
                {msg.role === "user" ? (
                  <User size={16} className="text-white" />
                ) : (
                  <Bot size={16} className="text-slate-300" />
                )}
              </div>

              <div
                className={`p-4 rounded-2xl shadow-md text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-tr-none"
                    : "bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700"
                }`}
              >
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
                          className="rounded-md my-2"
                          {...props}
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      ) : (
                        <code
                          className="bg-slate-800 text-indigo-300 px-1 py-0.5 rounded text-sm font-mono"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start animate-fade-in">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                <Bot size={16} className="text-slate-300" />
              </div>
              <div className="bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-slate-700 flex items-center gap-2">
                <Loader2 className="animate-spin text-indigo-400" size={16} />
                <span className="text-slate-400 text-sm">
                  Interviewer is typing...
                </span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      <footer className="p-4 bg-slate-900 border-t border-slate-800">
        <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent);
              }
            }}
            placeholder="Type your answer here..."
            className="w-full bg-slate-800 text-slate-100 placeholder-slate-500 rounded-xl py-4 pl-5 pr-14 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 border border-slate-700 transition-all resize-none min-h-14 max-h-40 overflow-y-auto"
            disabled={isLoading}
            rows={2}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SendHorizontal size={20} />
          </button>
        </form>
        <p className="text-center text-xs text-slate-600 mt-3">
          AI can make mistakes. Please verify technical answers.
        </p>
      </footer>
    </div>
  );
}
