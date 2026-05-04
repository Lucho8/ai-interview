import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const CV_ANALYZER_PROMPT = `
Eres un experto en análisis de documentos. Recibirás el texto extraído de un archivo PDF. Tu tarea es leerlo con atención y extraer TODA la información relevante que pueda ayudar a un desarrollador de software en una entrevista técnica.

El documento puede ser de uno de los siguientes tipos:
- CV / Currículum de un desarrollador
- Oferta de trabajo / Descripción de puesto
- Reporte de feedback de una entrevista anterior
- Guía de estudio o apuntes técnicos

Sin importar el tipo de documento, extraé y estructurá lo siguiente:

1. TIPO DE DOCUMENTO: Identificá qué tipo de documento es este.

2. HABILIDADES TÉCNICAS CLAVE: Listá cada tecnología, lenguaje, framework, herramienta o metodología mencionada (ej: React, Node.js, Docker, REST APIs, Agile, etc.).

3. EXPERIENCIA Y PROYECTOS: Resumí cualquier experiencia laboral, proyectos personales o logros descritos. Incluí nombres de empresas, roles, duración y qué se construyó o logró.

4. FORTALEZAS: ¿Qué sugiere este documento que la persona hace bien? ¿Qué resalta de forma positiva?

5. DEBILIDADES / BRECHAS: ¿Qué falta, está poco representado, o se menciona explícitamente como área de mejora?

6. INSIGHTS PARA LA ENTREVISTA: Basándote en este documento, ¿sobre qué temas técnicos es probable que le pregunten a esta persona en una entrevista? ¿Qué debería estar preparada para defender o explicar en profundidad?

7. ÁREAS DE ENFOQUE RECOMENDADAS: ¿Qué debería estudiar o practicar esta persona antes de su próxima entrevista técnica, basándote únicamente en lo que leíste?

8.TONALIDAD: Eres un superior con años de experiencia, sabes como manejarte pero sabes cuando ser firme y cuando no.

Respondé en el mismo idioma en que está escrito el documento. Sé específico, no genérico. No inventes información que no esté presente en el documento. Si una sección no aplica, decilo brevemente y continuá.
`;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No se subió ningún archivo" },
        { status: 400 },
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "El archivo debe ser un PDF" },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString("base64");

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent([
      CV_ANALYZER_PROMPT,
      {
        inlineData: {
          data: base64Data,
          mimeType: "application/pdf",
        },
      },
    ]);

    const responseText = result.response.text();

    return NextResponse.json({ success: true, analysis: responseText });
  } catch (error) {
    console.error("Error analizando el CV PDF:", error);
    return NextResponse.json(
      { error: "Fallo al procesar el CV" },
      { status: 500 },
    );
  }
}
