import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) return NextResponse.json([]);

    const interviews = await prisma.interview.findMany({
      where: { userId: userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true },
    });

    return NextResponse.json(interviews);
  } catch (error) {
    console.error("Error cargando historial:", error);
    return NextResponse.json(
      { error: "Error cargando chats" },
      { status: 500 },
    );
  }
}
