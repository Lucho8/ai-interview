# 🤖 AI Interview — Simulador de Entrevistas Técnicas con Memoria

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=flat-square&logo=tailwindcss)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=flat-square&logo=prisma)
![Clerk](https://img.shields.io/badge/Clerk-Auth-6C47FF?style=flat-square)
![Groq](https://img.shields.io/badge/Groq-LLaMA_3.3_70B-orange?style=flat-square)
![Gemini](https://img.shields.io/badge/Gemini-Embeddings-4285F4?style=flat-square&logo=google)
![pgvector](https://img.shields.io/badge/pgvector-Neon-00E599?style=flat-square)

Practicá entrevistas técnicas reales con un entrevistador de IA que **te recuerda**. El sistema aprende de tus sesiones anteriores usando memoria vectorial (RAG), analiza tu CV en segundos y te da feedback brutal y honesto al final de cada entrevista.

---

## ✨ Funcionalidades

- **Entrevistador IA realista** — hace una pregunta a la vez, evalúa tu respuesta, ajusta la dificultad dinámicamente y nunca te da el código fácil
- **Memoria vectorial (RAG)** — el entrevistador recuerda tus errores pasados y los menciona orgánicamente en la próxima sesión ("La vez pasada fallaste con X, a ver cómo te va hoy")
- **Análisis de CV / PDF** — subí tu currículum o una oferta de trabajo y la IA extrae habilidades, brechas y áreas de enfoque para la entrevista
- **Feedback estricto al finalizar** — reporte con Score Final, Puntos Fuertes, Áreas de Mejora y Conclusión. La IA penaliza si pediste código en lugar de escribirlo
- **Dashboard de progreso** — historial de entrevistas con scores, promedio general y último resultado
- **Cerebro de la IA visible** — panel que muestra todos los registros de memoria vectorial, con opción de leerlos completos o borrarlos
- **Respuestas en streaming** — el texto aparece token por token como en una conversación real
- **Títulos auto-generados** — cada sesión recibe un nombre basado en tu primer mensaje
- **Quick starts inteligentes** — la IA primero recopila contexto (nivel, tecnologías, objetivos) antes de arrancar con preguntas
- **Autenticación con Clerk** — sesiones anónimas en localStorage, sincronizadas a la DB al iniciar sesión
- **Multilenguaje** — la IA detecta y responde en español, inglés o el idioma que uses
- **Bloques de código con copy** — syntax highlighting con botón de copiar integrado

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript 5 |
| Estilos | Tailwind CSS v4 + variables `@theme` personalizadas |
| Entrevistador IA | LLaMA 3.3 70B via Groq API (streaming) |
| Análisis de PDF | Gemini 2.5 Flash (visión multimodal) |
| Embeddings / RAG | Gemini Embedding + pgvector en Neon |
| Autenticación | Clerk |
| Base de datos | PostgreSQL (Neon) via Prisma 7 + `@prisma/adapter-pg` |
| UI | Lucide React, React Hot Toast, React Markdown |
| Tipografías | Sora (sans) + JetBrains Mono (código) |

---

> - Groq gratuito: [console.groq.com](https://console.groq.com)
> - Gemini gratuito: [aistudio.google.com](https://aistudio.google.com)
> - Base de datos gratuita: [neon.tech](https://neon.tech)
> - Auth gratuita: [clerk.com](https://clerk.com)



## 📁 Estructura del Proyecto

```
ai-interview/
├── app/
│   ├── api/
│   │   ├── interview/
│   │   │   ├── route.ts           # POST — stream de respuestas + consulta RAG
│   │   │   └── [id]/route.ts      # GET historial, PATCH renombrar, DELETE
│   │   ├── interviews/route.ts    # GET todas las entrevistas del usuario
│   │   ├── memory/
│   │   │   ├── route.ts           # POST — genera embedding y guarda en pgvector
│   │   │   └── [id]/route.ts      # DELETE — borra un registro de memoria
│   │   ├── upload-cv/route.ts     # POST — analiza PDF con Gemini 2.5 Flash
│   │   └── sync/route.ts          # POST — sincroniza localStorage a DB al loguear
│   ├── dashboard/page.tsx         # Panel de progreso, scores y memoria vectorial
│   ├── interview/[id]/page.tsx    # Vista de sesión específica con feedback
│   ├── page.tsx                   # Home, quick starts y chat principal
│   ├── layout.tsx                 # Root layout con Sidebar + Clerk provider
│   └── globals.css                # Tokens @theme de Tailwind v4 + animaciones
├── components/
│   ├── Sidebar.tsx                # Historial, navegación, auth y nueva entrevista
│   ├── CodeBlock.tsx              # Bloque de código con syntax highlighting y copy
│   └── MemoryManager.tsx          # Panel de memoria vectorial con modal de detalle
└── prisma/
    └── schema.prisma              # Modelos Interview, Message y MemoryChunk
```

---

## 🗃️ Schema de la Base de Datos

```prisma
model Interview {
  id        String   @id @default(cuid())
  userId    String?
  title     String   @default("Nueva Entrevista")
  role      String?  @default("Fullstack Developer")
  seniority String?  @default("Mid-Level")
  topic     String?  @default("React y Node.js")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  messages  Message[]
}

model Message {
  id          String    @id @default(cuid())
  role        String    // "user" | "assistant"
  content     String
  createdAt   DateTime  @default(now())
  interviewId String
  interview   Interview @relation(fields: [interviewId], references: [id], onDelete: Cascade)
}

model MemoryChunk {
  id        String   @id @default(cuid())
  userId    String?
  type      String   // "FEEDBACK" | "CV" | "JOB_POST"
  content   String
  embedding Unsupported("vector(3072)")
  createdAt DateTime @default(now())
}
```

---

## 🧠 Cómo funciona el sistema RAG

El sistema de memoria funciona en dos pasos que ocurren automáticamente:

**Al finalizar una entrevista**, el feedback generado por la IA se vectoriza con Gemini Embedding y se guarda en `MemoryChunk` como un vector de 3072 dimensiones.

**Al inicio de cada mensaje**, el sistema genera el embedding de lo que el usuario acaba de escribir y hace una búsqueda de similitud coseno (`<=>`) en `MemoryChunk` para recuperar los 2 recuerdos más relevantes. Esos recuerdos se inyectan en el system prompt de forma invisible.

```
Usuario escribe → Embedding del mensaje → Búsqueda vectorial en Neon
       ↓
Recuerdos relevantes → Se inyectan en el system prompt
       ↓
LLaMA 3.3 70B los usa como contexto → Respuesta personalizada
```

El entrevistador los menciona de forma natural, como un mentor humano que recuerda orgánicamente ("La vez pasada fallaste con closures, a ver cómo te va hoy").

---

## 🤖 Reglas del Entrevistador IA

El system prompt define un conjunto estricto de comportamientos:

- **Una pregunta a la vez** — nunca listas, nunca preguntas en bloque
- **Evalúa antes de continuar** — correcto, parcial o incorrecto, siempre con feedback
- **Nunca da el código directo** — solo si el usuario está completamente trabado o insiste repetidamente
- **Ajusta la dificultad en tiempo real** — profundiza si respondés bien, retrocede si necesitás apoyo
- **Título automático** por sesión usando una segunda llamada al modelo
- **Feedback brutal y honesto** — penaliza si pediste código en lugar de escribirlo o si la sesión no fue una entrevista real

---

## 📊 Dashboard de Progreso

La página `/dashboard` muestra (solo para usuarios autenticados):

- Cantidad total de simulacros realizados
- Promedio general calculado desde la memoria vectorial
- Último score obtenido
- Historial completo con score, fecha y cantidad de mensajes
- Panel **"Cerebro de la IA"** con todos los registros vectoriales — podés leer el contenido completo en un modal o borrar recuerdos individualmente

---

## 📜 Licencia

MIT — sentite libre de forkear, extender y hacerlo tuyo.

---

<p align="center">Hecho con ☕ y muchas preguntas de código rechazadas.</p>
