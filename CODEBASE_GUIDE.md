# 🗺️ Agentic Interviewer — Codebase Reading Guide

> A structured guide for any developer (or your future self) to understand this project from first principles to full mastery.
> Follow the phases **in order** — each phase builds on the previous one.

---

## 🧠 Mental Model First

Before opening any file, hold this single idea in your head:

> **This app is an AI interviewer that reads your resume and asks progressively harder, context-aware questions — powered by a 6-step RAG (Retrieval-Augmented Generation) pipeline.**

Every file in the codebase does one of four things:

| Role | Files |
|------|-------|
| **Store / Retrieve data** | `lib/mongodb.ts`, `lib/rag/vector-store.ts` |
| **Process data** | `lib/rag/chunker.ts`, `lib/rag/embedder.ts`, `langgraph/nodes/planner.ts` |
| **Generate output** | `langgraph/nodes/questionGenerator.ts`, `lib/resume-analysis.ts` |
| **Connect user to system** | `app/api/*`, `app/(root)/*` pages |

---

## 📍 Phase 1 — The Data Contracts (15 min)

> **Read these first.** They define the exact shape of every piece of data in the system.
> Once you know the shapes, the logic in every other file becomes obvious.

### Files to read (in order):

```
models/InterviewState.ts        ← What is being tracked across the interview
models/ConversationMemory.ts    ← What a single Q&A turn looks like in MongoDB
models/ResumeChunk.ts           ← What a resume section looks like in MongoDB
```

### Questions to answer before moving on:

- What fields does `InterviewState` track?
  - `currentTopic`, `difficulty`, `questionCount`, `coveredTopics`, `plannerAction`
- Why does `ConversationMemory` store a `combinedText` field?
  - It holds `"Q: <question>\nA: <answer>"` — the exact text that was embedded into a vector
- Why does `ResumeChunk` have both `section` and `chunkIndex`?
  - `section` = the resume heading (e.g. "Projects"), `chunkIndex` = order within the resume

---

## 📍 Phase 2 — The Database Layer (20 min)

> Understand how data is persisted and retrieved **before** reading business logic.

### Files to read (in order):

```
lib/mongodb.ts                  ← Singleton MongoClient connection manager
lib/rag/vector-store.ts         ← All MongoDB reads/writes for the RAG system
```

### Questions to answer before moving on:

- **Why is `MongoClient` cached as a singleton?**
  - In serverless (Next.js API routes), each request can spawn a new process.
    Without caching, every request would open a new DB connection → exhausts Atlas limits.
- **What two collections exist for the RAG system?**
  - `resume_chunks` and `conversation_memory_chunks`
- **What is `$vectorSearch`?**
  - A MongoDB Atlas aggregation stage that finds the nearest embedding vectors by cosine similarity.
- **Why is `numCandidates: topK * 10`?**
  - Atlas Vector Search is approximate. Fetching 10x candidates then returning top-K improves recall accuracy.
- **Why does `fetchRecentConversationTurns` NOT use vector search?**
  - It needs chronological order, not semantic similarity. A `sort({ createdAt: -1 })` achieves this.

---

## 📍 Phase 3 — The Embedding Engine (15 min)

> Understand how text becomes a searchable number vector.

### Files to read (in order):

```
lib/rag/embedder.ts             ← fastembed BAAI/bge-small-en-v1.5 ONNX wrapper
lib/rag/chunker.ts              ← How a resume is split into focused section chunks
```

### Questions to answer before moving on:

- **What model is used for embeddings?**
  - `BAAI/bge-small-en-v1.5` via the `fastembed` package — outputs 384-dimensional vectors.
- **Why is `embeddingModel` a module-level singleton?**
  - Loading the ONNX model takes several seconds. Caching it ensures it only loads once per process.
- **What is `sentenceChunk()` and why does it use overlap?**
  - It splits a text block into ~300-character chunks. Overlap (~50 chars) carries the end of one chunk
    into the start of the next, preventing context loss at chunk boundaries.
- **Why are chunks sorted by `SECTION_ORDER`?**
  - Projects > Experience > Skills > Education — more relevant sections are retrieved first by vector search.

---

## 📍 Phase 4 — The Resume Upload Flow (20 min)

> Trace what happens end-to-end when a user uploads their resume.

### Files to read (in order):

```
lib/resume-parser.ts            ← File (PDF/DOCX/TXT) → plain text
lib/resume-analysis.ts          ← Plain text → structured JSON insights via Groq LLM
lib/rag/index.ts                ← Plain text → embedded chunks → stored in MongoDB
app/api/resume/route.ts         ← API route that orchestrates all of the above
```

### End-to-end flow:

```
User uploads file
  ↓
lib/resume-parser.ts
  Extracts raw plain text (PDF via pdf-parse, DOCX via mammoth, TXT directly)
  Normalizes whitespace

  ↓
lib/resume-analysis.ts
  Sends text to Groq LLM → structured JSON
  (skills, experience, education, projects, strengths, interview tips)

  ↓
lib/rag/index.ts  (embedAndStoreResume)
  1. chunkResumeText() → splits into section chunks
  2. embedTexts() → generates 384-dim vectors for each chunk
  3. upsertResumeChunks() → deletes old chunks, inserts new ones

  ↓
app/api/resume/route.ts
  Saves structured insights to MongoDB for the dashboard
  Returns JSON to the frontend
```

### Questions to answer before moving on:

- **Why is `pdf-parse` dynamically imported?**
  - Avoids loading a large library into memory for every request — only loaded when a PDF is uploaded.
- **Why is embedding fired as a background (non-awaited) process?**
  - Embedding takes 2–5 seconds. Not awaiting it lets the API return the analysis JSON immediately
    without blocking the user.

---

## 📍 Phase 5 — The RAG Context Building (15 min)

> Understand how retrieved MongoDB data becomes readable LLM prompt text.

### Files to read (in order):

```
lib/rag/retriever.ts            ← Parallel fetch from all 3 data sources
lib/rag/context-builder.ts      ← Format raw data into labelled prompt text blocks
```

### Questions to answer before moving on:

- **Why does `retrieveAll()` use `Promise.all()`?**
  - All three fetches are independent. Running in parallel makes total time = slowest fetch,
    not sum of all three.
- **What are the 4 context blocks injected into the LLM prompt?**
  1. `resumeContext` — top resume chunks from vector search
  2. `conversationMemoryContext` — semantically similar prior Q&A turns (vector search)
  3. `recentMemoryContext` — last 5 turns chronologically (direct fetch, NOT vector search)
  4. `interviewStateContext` — current topic, difficulty, question count
- **What is the critical difference between `conversationMemoryContext` and `recentMemoryContext`?**
  - `conversationMemoryContext` = **topically relevant** (can be from any point in the session)
  - `recentMemoryContext` = **chronologically recent** (last few messages, for conversational flow)

---

## 📍 Phase 6 — The LangGraph Brain ⭐ (30 min)

> **This is the core of the system. Read carefully.** 80% of the AI intelligence lives here.

### Files to read (in order):

```
langgraph/graph.ts                         ← Pipeline definition, shared state, entry point
langgraph/nodes/retrieveResume.ts          ← Node 1: embed answer → find resume chunks
langgraph/nodes/retrieveConversation.ts    ← Node 2: embed Q+A → find similar turns
langgraph/nodes/fetchRecentMemory.ts       ← Node 3: get last 5 turns (direct DB fetch)
langgraph/nodes/planner.ts                 ← Node 4: heuristic decision (NO LLM call!)
langgraph/nodes/questionGenerator.ts       ← Node 5: call Groq → generate next question
langgraph/nodes/saveMemory.ts              ← Node 6: embed + store the completed turn
```

### Pipeline — draw this on paper as you read:

```
INPUT: { userId, sessionId, currentQuestion, latestAnswer, interviewState }
  │
  ├─ Node 1  embedQuery(latestAnswer)       → Atlas $vectorSearch → resumeChunks
  ├─ Node 2  embedQuery("Q:...\nA:...")     → Atlas $vectorSearch → similarTurns
  ├─ Node 3  sort({ createdAt: -1 })        → direct MongoDB fetch → recentTurns
  │
  ├─ Node 4  heuristic rules only           → plannerAction
  │            answer < 15 words?           →  'simplify'
  │            3+ questions on topic?       →  'change_topic'
  │            every 2nd question?          →  'increase_difficulty'
  │            topic = 'Introduction'?      →  'change_topic'  (post-intro pivot)
  │            default?                     →  'follow_up'
  │
  ├─ Node 5  build RAG prompt from all context → Groq API call → generatedQuestion
  │
  └─ Node 6  embed("Q:...\nA:...")          → storeConversationTurn()
             questionCount++               → interviewState updated
             inferTopic(generatedQuestion) → currentTopic updated

OUTPUT: { generatedQuestion, updatedInterviewState }
```

### Questions to answer before moving on:

- **Why does Node 4 (planner) NOT call an LLM?**
  - Pure heuristics are deterministic, fast, and have zero API cost. The LLM is expensive — only use it for generation.
- **What is `inferTopic()` in `saveMemory`?**
  - After `change_topic`, `currentTopic` is reset to `''`. `inferTopic()` reads the newly generated question
    and keyword-matches it to a canonical label (e.g. "React", "MongoDB") to restore the topic.
- **Why is the compiled graph a singleton?**
  - `graph.compile()` validates edges and registers nodes — non-trivial work. Done once, reused everywhere.
- **Why does Node 2 embed `"Q: ...\nA: ..."` combined?**
  - Each stored document was embedded from the same combined format. The query must match the storage format
    to achieve accurate cosine similarity results.

---

## 📍 Phase 7 — The Interview API Route (20 min)

> Understand how the frontend talks to the LangGraph pipeline.

### File to read:

```
app/api/interview/route.ts     ← POST handler for each interview turn
```

### Request → Response flow:

```
POST /api/interview
  { sessionId, currentQuestion, latestAnswer }
  │
  ├─ auth() → verify Clerk user → get userId
  ├─ Load interviewState from MongoDB (or create initial if first turn)
  │
  ├─ if (questionCount === 0) → return INTRO_QUESTION immediately
  │    (skip the graph — no answer to process yet)
  │
  └─ else → runInterviewRAG({
               userId, sessionId,
               currentQuestion, latestAnswer,
               interviewState
             })
             → save updatedInterviewState to MongoDB
             → return { question: generatedQuestion, interviewState }
```

### Questions to answer before moving on:

- **Why is the intro question returned without running the graph?**
  - On the first turn there is no `latestAnswer` yet. The graph needs an answer to embed and retrieve against.
    So the intro question is hard-coded and returned directly.
- **What gets persisted to MongoDB after each turn?**
  - The updated `interviewState` (new topic, new difficulty, incremented `questionCount`).

---

## 📍 Phase 8 — The Frontend (20 min)

> Read the UI last — once you understand the API, the components make complete sense.

### Files to read (in order):

```
app/layout.tsx                              ← Root: ClerkProvider, fonts, PWA service worker
app/(root)/page.tsx                         ← Landing page
app/(root)/dashboard/page.tsx               ← Post-auth user dashboard
app/(root)/interview/page.tsx               ← Live interview session page
components/InterviewSession.tsx             ← Core interview chat UI component
```

### Questions to answer before moving on:

- **How does the interview page call the backend?**
  - `POST /api/interview` with `{ sessionId, currentQuestion, latestAnswer }`
- **When is `createBehaviorAnalyzer().start()` called?**
  - When the user grants camera permission and the interview starts.
- **Why is `ClerkProvider` at the root layout level?**
  - So Clerk auth state is available to both client components (hooks) and server components (`auth()`).

---

## 📍 Phase 9 — Behavior Analysis (15 min)

> Read last — a completely independent computer vision pipeline that runs in the browser only.

### Files to read (in order):

```
lib/behavior-metrics.ts         ← Types, accumulator class, metric computation
lib/behavior-analysis.ts        ← MediaPipe + ONNX real-time frame processor
```

### How the pipeline works per frame:

```
setInterval (every ~200ms = 5fps)
  │
  ├─ Draw video frame to hidden <canvas>
  ├─ MediaPipe FaceLandmarker → 468 facial landmark points
  ├─ Extract face bounding box → crop face region
  ├─ Resize crop to 64×64px (FER+ model input size)
  ├─ Convert to Float32Array tensor
  ├─ ONNX Runtime inference → 8 emotion logits
  ├─ Softmax → emotion probabilities
  └─ BehaviorAccumulator.record(emotionProbs, faceDetected)

stop() called → accumulator.summarize() → BehaviorMetrics
```

### Questions to answer:

- **What model runs for emotion detection?**
  - `ferplus.onnx` — FER+ model, classifies into 8 emotions: neutral, happiness, surprise, sadness, anger, disgust, fear, contempt.
- **Why are MediaPipe console logs suppressed?**
  - MediaPipe logs every processed frame. At 5fps over a 20-minute interview that's 6,000 log lines — the console would flood.
- **Why is this browser-only?**
  - It uses `document`, `HTMLVideoElement`, `<canvas>`, and WebAssembly WASM binaries — none of which exist on Node.js.

---

## 🔑 Key Architectural Decisions — Quick Reference

| Decision | Why it was made |
|----------|----------------|
| Singleton `MongoClient` | Prevents connection pool exhaustion in serverless environments |
| Singleton `FlagEmbedding` model | ONNX model takes ~3s to load; load once, reuse indefinitely |
| Singleton compiled LangGraph | `graph.compile()` validates edges — expensive, done once per process |
| Embed Q+A **combined** (`"Q:...\nA:..."`) | Storage and query must use identical format for cosine similarity to work |
| **Dual retrieval**: vector search + direct sort | Vector → topical relevance. Sort → chronological continuity. Both are needed. |
| Planner uses heuristics, **not an LLM** | Deterministic, zero latency, zero API cost |
| Resume split into **chunks by section** | Fine-grained retrieval. Full-resume embedding loses section-level precision. |
| Background embedding on resume upload | ONNX embedding takes 2–5s. Non-awaited so HTTP response isn't blocked. |
| `pdf-parse` dynamically imported | Avoid loading a large module for DOCX/TXT uploads |

---

## 🗂️ Project Structure at a Glance

```
Agentic_Interviewer/
│
├── models/                      ← TypeScript type definitions (read FIRST)
│   ├── InterviewState.ts
│   ├── ConversationMemory.ts
│   └── ResumeChunk.ts
│
├── lib/
│   ├── mongodb.ts               ← Singleton DB connection
│   ├── resume-parser.ts         ← PDF/DOCX/TXT → plain text
│   ├── resume-analysis.ts       ← Plain text → structured JSON (Groq)
│   ├── behavior-metrics.ts      ← Behavior data types + accumulator
│   ├── behavior-analysis.ts     ← MediaPipe + ONNX frame processor
│   ├── utils.ts                 ← Shared utilities
│   └── rag/
│       ├── embedder.ts          ← fastembed ONNX wrapper
│       ├── chunker.ts           ← Resume section splitter
│       ├── vector-store.ts      ← MongoDB Atlas vector search operations
│       ├── context-builder.ts   ← Format retrieved data → prompt blocks
│       ├── retriever.ts         ← Parallel fetch from all 3 data sources
│       └── index.ts             ← Public RAG API (embedAndStoreResume)
│
├── langgraph/
│   ├── graph.ts                 ← Pipeline definition + runInterviewRAG()
│   └── nodes/
│       ├── retrieveResume.ts    ← Node 1
│       ├── retrieveConversation.ts ← Node 2
│       ├── fetchRecentMemory.ts ← Node 3
│       ├── planner.ts           ← Node 4
│       ├── questionGenerator.ts ← Node 5
│       └── saveMemory.ts        ← Node 6
│
├── app/
│   ├── layout.tsx               ← Root layout (ClerkProvider, fonts)
│   ├── api/
│   │   ├── resume/route.ts      ← Resume upload API
│   │   └── interview/route.ts   ← Interview turn API
│   └── (root)/
│       ├── page.tsx             ← Landing page
│       ├── dashboard/page.tsx   ← User dashboard
│       └── interview/page.tsx   ← Live interview UI
│
└── components/                  ← Reusable React components
```

---

## ⏱️ Estimated Reading Time

| Phase | Files | Time |
|-------|-------|------|
| 1. Data Contracts | 3 files | 15 min |
| 2. Database Layer | 2 files | 20 min |
| 3. Embedding Engine | 2 files | 15 min |
| 4. Resume Upload Flow | 4 files | 20 min |
| 5. Context Building | 2 files | 15 min |
| 6. LangGraph Pipeline ⭐ | 7 files | 30 min |
| 7. Interview API Route | 1 file | 20 min |
| 8. Frontend | 5 files | 20 min |
| 9. Behavior Analysis | 2 files | 15 min |
| **Total** | **28 files** | **~2.5 hours** |

> **Shortcut:** After completing Phase 6 you understand ~80% of the system.
> Phases 7–9 are optional if your primary interest is the AI/RAG pipeline.
