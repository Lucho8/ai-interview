import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: interviewId } = await params;
    const { userId } = await auth(); // 1. Vemos quién está logueado

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: { userId: true, title: true },
    });

    if (!interview) {
      return NextResponse.json(
        { error: "Entrevista no encontrada" },
        { status: 404 },
      );
    }

    if (interview.userId && interview.userId !== userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const messages = await prisma.message.findMany({
      where: { interviewId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        content: true,
      },
    });

    if (!messages || messages.length === 0) {
      return NextResponse.json({ messages: [] });
    }
    return NextResponse.json({
      messages: messages || [],
      title: interview.title,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { userId } = await auth();

    const interview = await prisma.interview.findUnique({
      where: { id: id },
      select: { userId: true },
    });

    if (!interview) {
      return NextResponse.json(
        { error: "Entrevista no encontrada" },
        { status: 404 },
      );
    }

    if (interview.userId && interview.userId !== userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { title } = body;

    const updatedInterview = await prisma.interview.update({
      where: { id: id },
      data: { title: title },
    });

    return NextResponse.json(updatedInterview);
  } catch (error) {
    console.error("Error updating title:", error);
    return NextResponse.json(
      { error: "Failed to update title" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { userId } = await auth();

    const interview = await prisma.interview.findUnique({
      where: { id: id },
      select: { userId: true },
    });

    if (!interview) {
      return NextResponse.json(
        { error: "Entrevista no encontrada" },
        { status: 404 },
      );
    }

    if (interview.userId && interview.userId !== userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await prisma.interview.delete({
      where: { id: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting interview:", error);
    return NextResponse.json(
      { error: "Failed to delete interview" },
      { status: 500 },
    );
  }
}
