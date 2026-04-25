import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const systemPrompt = `
You are a professional, engaging, and slightly challenging technical interviewer for a Junior or Senior Software Engineer position.
You will know if the candidate is a Junior or Senior based on their responses and adjust your questions accordingly. 
Your goal is to conduct a realistic job interview.
Since The beginning of the interview, you will ask questions about the candidate's background, experience, and technical skills.

RULES:
1. NEVER answer the candidate's questions or give away the answers to technical problems.
2. Ask ONE question at a time. Wait for the candidate's response before moving to the next topic.
3. Start by introducing yourself and asking the first question about their background.
4. If the candidate gives a vague answer, ask a follow-up question to dig deeper.
5. Maintain a professional but warm tone. Do not be rude, but do not be overly friendly either.
6. Do not break character. You are not a chatbot; you are a human interviewer.
7. Keep your responses concise (max 3-4 sentences) to encourage the candidate to speak.
8. Focus on real-world experience and problem-solving skills. Avoid theoretical questions.
9. If the candidate is a Junior, ask more fundamental questions about programming concepts, data structures, and algorithms.
10. If the candidate is a Senior, ask more complex questions about system design, architecture, and advanced programming topics.
11. If the candidate asks for feedback, provide constructive criticism based on their answers, but do not give away the correct answers to any questions.
12. The interview should last around 30 minutes, so manage the flow of questions accordingly.
13. At the end of the interview, thank the candidate for their time and provide a brief summary of their performance without giving a clear pass/fail verdict.
14. if the candidate doesn't answer a question you have given, ask them if they want to move on to the next question or if they want to try answering it again.
15. starting the interview be more friendly and engaging, but as the interview progresses, become more challenging and less forgiving of vague answers.
`;

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | any[];
}

interface TextContent {
  type: string;
  text: string;
}

function sanitizeMessages(messages: ChatMessage[]) {
  return messages.map((msg) => {
    let content = msg.content;

    if (Array.isArray(content)) {
      content = content
        .filter((item: TextContent) => item.type === "text")
        .map((item: TextContent) => item.text)
        .join(" ");
    }

    if (typeof content === "object" && content !== null) {
      if ("text" in content && typeof (content as any).text === "string") {
        content = (content as any).text;
      } else {
        content = JSON.stringify(content);
      }
    }

    return {
      role: msg.role,
      content: String(content),
    };
  });
}

export async function POST(req: Request) {
  try {
    const { messages: rawMessages, id: interviewId } = await req.json();

    if (!rawMessages || !Array.isArray(rawMessages)) {
      return NextResponse.json(
        { error: "Invalid messages format" },
        { status: 400 },
      );
    }

    const cleanMessages = sanitizeMessages(rawMessages);

    const hasSystem = cleanMessages.some((m: any) => m.role === "system");
    let finalMessages = cleanMessages;
    if (!hasSystem) {
      finalMessages = [
        { role: "system", content: systemPrompt },
        ...cleanMessages,
      ];
    }

    let currentId = interviewId;

    if (!currentId) {
      const newInterview = await prisma.interview.create({ data: {} });
      currentId = newInterview.id;

      if (cleanMessages[0] && cleanMessages[0].role === "assistant") {
        await prisma.message.create({
          data: {
            role: "assistant",
            content: cleanMessages[0].content,
            interviewId: currentId,
          },
        });
      }
    }

    const lastUserMessage = cleanMessages[cleanMessages.length - 1];
    if (lastUserMessage && lastUserMessage.role === "user") {
      await prisma.message.create({
        data: {
          role: "user",
          content: lastUserMessage.content,
          interviewId: currentId,
        },
      });
    }

    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: finalMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      return NextResponse.json(
        { error: errorData.message || "Failed to get response from AI" },
        { status: response.status },
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) return controller.close();

        let buffer = "";
        let fullresponse = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");

          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const data = JSON.parse(line.slice(6));
                const text = data.choices[0]?.delta?.content || "";
                fullresponse += text;
                controller.enqueue(encoder.encode(text));
              } catch (e) {
                console.error("Error parseando JSON:", e);
              }
            }
          }
        }
        controller.close();

        if (fullresponse.trim() !== "") {
          try {
            await prisma.message.create({
              data: {
                role: "assistant",
                content: fullresponse,
                interviewId: currentId as string,
              },
            });
          } catch (dbError) {
            console.error(
              "Error guardando el mensaje de la IA en la BD:",
              dbError,
            );
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "X-Interview-Id": currentId as string,
      },
    });
  } catch (error) {
    console.error("Error in interview route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
