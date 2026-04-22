import { NextResponse } from "next/server";

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
`;

function sanitizeMessages(messages: any[]) {
  return messages.map((msg: any) => {
    let content = msg.content;

    if (Array.isArray(content)) {
      content = content
        .filter((item: any) => item.type === "text")
        .map((item: any) => item.text)
        .join(" ");
    }

    if (typeof content === "object" && content !== null) {
      if (content.text) content = content.text;
      else content = JSON.stringify(content);
    }

    return {
      role: msg.role,
      content: String(content),
    };
  });
}

export async function POST(req: Request) {
  try {
    const { messages: rawMessages } = await req.json();

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

    // 1. Call Groq WITHOUT streaming
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: finalMessages,
        stream: false, // Changed to false
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      console.error("Groq Error:", errorData);
      return NextResponse.json(
        { error: errorData.message || "Failed to get response from AI" },
        { status: response.status },
      );
    }

    // 2. Parse the full JSON response
    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || "";

    // 3. Return simple JSON
    return NextResponse.json({
      message: aiContent,
      usage: data.usage,
    });
  } catch (error) {
    console.error("Error in interview route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
