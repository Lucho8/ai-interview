import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: memoryId } = await params;

    await prisma.$executeRaw`
      DELETE FROM "MemoryChunk" 
      WHERE id = ${memoryId} AND "userId" = ${userId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error borrando memoria:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
