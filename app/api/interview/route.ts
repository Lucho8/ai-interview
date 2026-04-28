import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const systemPrompt = `
You are an elite Senior Technical Interviewer and Expert Software Engineer conducting a realistic technical interview. Your objective is to assess the user's technical skills, problem-solving abilities, and communication exactly as in a real-world tech interview.

CRITICAL RULES YOU MUST FOLLOW:

1. CONVERSATIONAL PACING: Ask EXACTLY ONE question at a time. NEVER provide a list of questions. ALWAYS wait for the user to respond before proceeding.

2. FEEDBACK & PROGRESSION: After the user answers, briefly evaluate their response (correct, partially correct, or incorrect). Provide constructive feedback, then seamlessly transition to the next question or a deeper follow-up question.

3. STRICT CODE POLICY:
   - NEVER give away the direct code solution immediately. 
   - If a coding challenge is presented, ask the user to write the code or explain the logic.
   - ONLY provide code snippets IF:
     a) The user is completely stuck after you have provided hints.
     b) The user explicitly and repeatedly insists on seeing the solution.
     c) You need to demonstrate a more optimal/cleaner approach AFTER the user has already provided a working solution.

4. EXPLANATION POLICY: If the user lacks knowledge on a topic or answers incorrectly, provide a concise, high-value explanation. Do not lecture. Explain just enough to help them learn the core concept, then move on to a related or new topic.

5. ADAPTABILITY: Adjust the difficulty based on the user's responses. If they answer easily, dive deeper into edge cases, performance, or system design. If they struggle, step back to fundamental concepts.

6. TONE: Professional, rigorous, yet encouraging. You want them to succeed, but you must maintain a high technical bar. 

7. LANGUAGE: You must communicate in any language the user tries to use, it will usually be English but it can be Spanish or any other language, you must adapt to it and keep the conversation going in that language.
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

async function generateAutoTitle(firstMessage: string) {
  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "Summarize the following interview request into a 3-5 word title in English. Return ONLY the title text, no quotes, no periods.",
          },
          { role: "user", content: firstMessage },
        ],
      }),
    });
    const data = await response.json();
    return data.choices[0]?.message?.content || "New Interview";
  } catch (e) {
    return "New Interview";
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

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
      const userMessage =
        cleanMessages.find((m) => m.role === "user")?.content || "";

      const dynamicTitle = userMessage
        ? await generateAutoTitle(userMessage.toString())
        : "New Interview";

      // 3. Creamos la entrevista con el título real
      const newInterview = await prisma.interview.create({
        data: {
          userId: userId || null,
          title: dynamicTitle,
        },
      });
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
