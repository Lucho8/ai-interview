import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  BrainCircuit,
  Target,
  Trophy,
  Clock,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { MemoryManager } from "@/components/MemoryManager";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const interviews = await prisma.interview.findMany({
    where: { userId },
    include: { messages: true },
    orderBy: { createdAt: "desc" },
  });

  let totalInterviews = interviews.length;

  const rawMemories: any[] = await prisma.$queryRaw`
    SELECT id, type, content, "createdAt" 
    FROM "MemoryChunk" 
    WHERE "userId" = ${userId} 
    ORDER BY "createdAt" DESC
  `;

  let totalMemoryScore = 0;
  let memoryScoreCount = 0;
  let lastMemoryScore = "N/A";

  const userMemories = rawMemories.map((m) => {
    if (m.type === "FEEDBACK") {
      const match = m.content.match(/Score Final[^\d]*(\d+)/i);
      if (match && match[1]) {
        const scoreVal = parseInt(match[1]);
        totalMemoryScore += scoreVal;
        memoryScoreCount++;

        if (lastMemoryScore === "N/A") {
          lastMemoryScore = scoreVal.toString();
        }
      }
    }

    return {
      id: m.id,
      type: m.type,
      content: m.content,
      snippet: m.content.substring(0, 100).replace(/\n/g, " ") + "...",
      date: new Date(m.createdAt).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "short",
      }),
    };
  });

  const memoryAverageScore =
    memoryScoreCount > 0 ? Math.round(totalMemoryScore / memoryScoreCount) : 0;

  const processedInterviews = interviews.map((interview) => {
    let score = "N/A";
    let isFinished = false;

    const feedbackMessage = interview.messages.find(
      (m) => m.role === "assistant" && /Score Final/i.test(m.content),
    );

    if (feedbackMessage) {
      isFinished = true;
      const match = feedbackMessage.content.match(/Score Final[^\d]*(\d+)/i);
      if (match && match[1]) {
        score = match[1];
      }
    }

    return {
      id: interview.id,
      title: interview.title || "Entrevista Técnica",
      date: new Date(interview.createdAt).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "short",
      }),
      score,
      isFinished,
      messageCount: interview.messages.length,
    };
  });

  const lastFinishedInterview = processedInterviews.find(
    (interview) => interview.isFinished && interview.score !== "N/A",
  );
  const ultimoScoreReal = lastFinishedInterview
    ? lastFinishedInterview.score
    : "N/A";

  return (
    <div className="min-h-screen bg-bg text-fg p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold bg-linear-to-br from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            Tu Progreso
          </h1>
          <p className="text-muted mt-1 text-sm">
            Analítica basada en la memoria en vivo de la IA.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-white/10 p-5 rounded-2xl flex items-center gap-4 shadow-lg shadow-black/20">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <BrainCircuit size={24} />
            </div>
            <div>
              <p className="text-sm text-muted">Simulacros Totales</p>
              <p className="text-2xl font-bold">{totalInterviews}</p>
            </div>
          </div>

          <div className="bg-card border border-white/10 p-5 rounded-2xl flex items-center gap-4 shadow-lg shadow-black/20">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Trophy size={24} />
            </div>
            <div>
              <p className="text-sm text-muted">Promedio General</p>
              <p className="text-2xl font-bold">
                {memoryAverageScore > 0 ? `${memoryAverageScore}/100` : "-"}
              </p>
            </div>
          </div>

          <div className="bg-card border border-white/10 p-5 rounded-2xl flex items-center gap-4 shadow-lg shadow-black/20">
            <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-400">
              <Target size={24} />
            </div>
            <div>
              <p className="text-sm text-muted">Último Score</p>
              <p className="text-2xl font-bold">
                {/* 👇 ACTUALIZAMOS LA VARIABLE ACÁ 👇 */}
                {ultimoScoreReal !== "N/A" ? `${ultimoScoreReal}/100` : "-"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-white/10 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock size={18} className="text-indigo-400" />
              Historial de Entrevistas
            </h2>
          </div>

          <div className="divide-y divide-white/5">
            {processedInterviews.length === 0 ? (
              <div className="p-8 text-center text-muted text-sm">
                Todavía no tenés entrevistas registradas. ¡Andá a practicar!
              </div>
            ) : (
              processedInterviews.map((interview) => (
                <Link
                  key={interview.id}
                  href={`/interview/${interview.id}`}
                  className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group cursor-pointer"
                >
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium text-fg group-hover:text-indigo-300 transition-colors">
                      {interview.title}
                    </p>
                    <p className="text-[12px] text-muted flex items-center gap-2">
                      {interview.date} • {interview.messageCount} mensajes
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    {interview.score !== "N/A" ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {interview.score}/100
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 text-muted border border-white/10">
                        En curso
                      </span>
                    )}
                    <ChevronRight
                      size={18}
                      className="text-muted group-hover:text-indigo-400 transition-colors"
                    />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <MemoryManager initialMemories={userMemories} />
      </div>
    </div>
  );
}
