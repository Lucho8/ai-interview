import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("No autorizado", { status: 401 });
    }

    const { chatIds } = await req.json();

    if (!chatIds || !Array.isArray(chatIds) || chatIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No hay chats para sincronizar",
      });
    }

    const result = await prisma.interview.updateMany({
      where: {
        id: { in: chatIds },
        userId: null,
      },
      data: {
        userId: userId,
      },
    });

    return NextResponse.json({ success: true, updatedCount: result.count });
  } catch (error) {
    console.error("Error en la sincronización:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
