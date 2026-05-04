"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BrainCircuit,
  FileText,
  Trash2,
  Loader2,
  Database,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";

type Memory = {
  id: string;
  type: string;
  content: string;
  snippet: string;
  date: string;
};

export function MemoryManager({
  initialMemories,
}: {
  initialMemories: Memory[];
}) {
  const [memories, setMemories] = useState<Memory[]>(initialMemories);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const router = useRouter();

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (
      !confirm(
        "¿Seguro que querés borrar este recuerdo de la IA? Tus promedios se recalcularán.",
      )
    )
      return;

    setIsDeleting(id);
    try {
      const res = await fetch(`/api/memory/${id}`, { method: "DELETE" });

      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
        toast.success("Memoria formateada con éxito.");

        router.refresh();
      } else {
        throw new Error("Fallo al borrar");
      }
    } catch (error) {
      toast.error("Error al borrar la memoria");
    } finally {
      setIsDeleting(null);
    }
  };

  if (memories.length === 0) return null;

  return (
    <>
      <div className="bg-card border border-white/10 rounded-2xl overflow-hidden shadow-xl shadow-black/20 mt-8">
        <div className="px-6 py-4 border-b border-white/5 bg-white/2 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2 text-fg">
              <Database size={18} className="text-violet-400" />
              Cerebro de la IA (Memoria Vectorial)
            </h2>
            <p className="text-xs text-muted mt-1">
              Hacé clic en un registro para leerlo completo.
            </p>
          </div>
        </div>

        <div className="divide-y divide-white/5 max-h-100 overflow-y-auto">
          {memories.map((memory) => (
            <div
              key={memory.id}
              onClick={() => setSelectedMemory(memory)}
              className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group cursor-pointer"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-1">
                  {memory.type === "CV" ? (
                    <FileText size={16} className="text-blue-400" />
                  ) : (
                    <BrainCircuit size={16} className="text-emerald-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg flex items-center gap-2">
                    {memory.type === "CV"
                      ? "Análisis de Currículum"
                      : "Feedback de Entrevista"}
                    <span className="text-[10px] bg-white/10 text-muted px-1.5 py-0.5 rounded-sm">
                      {memory.date}
                    </span>
                  </p>
                  <p className="text-xs text-muted truncate mt-1 max-w-62.5 sm:max-w-md">
                    {memory.snippet}
                  </p>
                </div>
              </div>

              <button
                onClick={(e) => handleDelete(e, memory.id)}
                disabled={isDeleting === memory.id}
                className="p-2 rounded-lg text-muted hover:bg-red-500/20 hover:text-red-400 transition-colors disabled:opacity-50"
                title="Borrar este recuerdo"
              >
                {isDeleting === memory.id ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <Trash2 size={16} />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {selectedMemory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedMemory(null)}
        >
          <div
            className="bg-card border border-white/10 p-6 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()} // Evita que se cierre al hacer clic adentro
          >
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
              <h3 className="text-lg font-semibold text-fg flex items-center gap-2">
                {selectedMemory.type === "CV" ? (
                  <FileText className="text-blue-400" size={20} />
                ) : (
                  <BrainCircuit className="text-emerald-400" size={20} />
                )}
                {selectedMemory.type === "CV"
                  ? "Análisis de Currículum"
                  : "Feedback de Entrevista"}
              </h3>
              <button
                onClick={() => setSelectedMemory(null)}
                className="p-1 text-muted hover:text-fg hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto pr-2 custom-scrollbar text-sm text-fg leading-relaxed space-y-4">
              <ReactMarkdown
                components={{
                  h1: ({ node, ...props }) => (
                    <h1
                      className="text-xl font-bold text-indigo-300 mt-4 mb-2"
                      {...props}
                    />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2
                      className="text-lg font-semibold text-indigo-200 mt-4 mb-2"
                      {...props}
                    />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3
                      className="text-base font-semibold text-white mt-3 mb-2"
                      {...props}
                    />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc pl-5 space-y-1 my-2" {...props} />
                  ),
                  p: ({ node, ...props }) => <p className="mb-2" {...props} />,
                }}
              >
                {selectedMemory.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
