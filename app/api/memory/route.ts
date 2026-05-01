import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { content, type, userId } = body;

    console.log("📥 /api/memory llamado con:", {
      type,
      userId,
      contentLength: content?.length,
    });

    if (!content) {
      return NextResponse.json(
        { error: "Falta el contenido" },
        { status: 400 },
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY no está definida en .env");
      return NextResponse.json(
        { error: "Falta GEMINI_API_KEY" },
        { status: 500 },
      );
    }

    // 1. Generar embedding con Gemini

    console.log("🔄 Generando embedding...");
    const model = genAI.getGenerativeModel({
      model: "gemini-embedding-2",
    });
    const result = await model.embedContent(content);
    const embedding = result.embedding.values;

    console.log(`✅ Embedding generado: ${embedding.length} dimensiones`);

    // 2. Formatear para pgvector — usa corchetes [ ]
    const vectorString = `[${embedding.join(",")}]`;
    const id = crypto.randomUUID();

    // 3. Insertar en Neon via raw SQL
    console.log("💾 Insertando en MemoryChunk...");
    await prisma.$executeRaw`
      INSERT INTO "MemoryChunk" (id, "userId", type, content, embedding, "createdAt")
      VALUES (
        ${id},
        ${userId ?? null},
        ${type},
        ${content},
        ${vectorString}::vector,
        NOW()
      )
    `;

    console.log("✅ Memoria guardada en Neon con id:", id);
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    // Mostramos el error completo en la terminal de Next.js
    console.error("❌ Error en /api/memory:");
    console.error(error?.message ?? error);
    if (error?.cause) console.error("Causa:", error.cause);

    return NextResponse.json(
      { error: error?.message ?? "Error interno" },
      { status: 500 },
    );
  }
}
