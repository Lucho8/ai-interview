"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";

import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export function CodeBlock({
  node,
  inline,
  className,
  children,
  ...props
}: any) {
  const match = /language-(\w+)/.exec(className || "");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline && match) {
    return (
      <div className="relative rounded-xl overflow-hidden my-6 border border-white/10 shadow-lg shadow-black/40">
        <div className="flex items-center justify-between px-4 py-2.5 bg-white/3 border-b border-white/5 backdrop-blur-md">
          <span className="text-xs text-muted font-mono lowercase select-none">
            {match[1]}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-fg transition-colors"
            title="Copiar código"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copiado!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copiar</span>
              </>
            )}
          </button>
        </div>

        <SyntaxHighlighter
          {...props}
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: "1rem",
            background: "#0a0a0a", // Un fondo súper oscuro para contraste
            fontSize: "0.85rem",
          }}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      </div>
    );
  }

  return (
    <code
      className="bg-indigo-500/10 text-indigo-300 px-1.5 py-0.5 rounded-md text-[0.85em] font-mono border border-indigo-500/20"
      {...props}
    >
      {children}
    </code>
  );
}
