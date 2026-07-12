# Intervo — Agentic AI Interview Platform

> **Live app:** [https://intervoo.vercel.app/](https://intervoo.vercel.app/)

Intervo is a full-stack, AI-powered mock interview platform built with Next.js. It generates resume-tailored interview questions, conducts realistic voice+video interview sessions, evaluates answers in real time, and now features a **full RAG (Retrieval-Augmented Generation) pipeline** that makes the AI interviewer remember your resume and past answers — producing intelligent, adaptive follow-up questions instead of generic ones.

---

## What It Does

| Feature | Description |
|---------|-------------|
| **Resume Analysis** | Upload PDF / DOCX / TXT → Groq LLM extracts skills, strengths, experience, ATS score, and suggested roles |
| **Resume RAG Embedding** | Resume is automatically chunked (section-aware) and embedded with FastEmbed → stored in MongoDB Atlas Vector Search |
| **Realistic Interview Opener** | Every session always starts with **"Tell me about yourself"** — exactly like a real interview — before any RAG question is asked |
| **Adaptive Question Generation** | After the intro, LangGraph retrieves resume context + prior conversation turns to generate exactly one contextual follow-up per turn |
| **Interview Memory** | Every Q&A turn is embedded and stored — the AI recalls what was already discussed in the session |
| **Real-time Evaluation** | Each answer is graded by Groq against resume background: score, strengths, improvement areas, follow-up question |
| **Behavior Analysis** | On-device facial expression analysis (confidence, anxiety, eye contact) using MediaPipe Face Landmarker + ONNX emotion model |
| **Voice Interview** | Record audio answers, transcribe via Whisper / OpenAI-compatible endpoint |
| **Performance Dashboard** | Per-session scores, behavior metrics per answer, personalized improvement guidance |
| **PWA Support** | Installable as a Progressive Web App with service worker and web manifest |
| **Authentication** | Clerk-powered sign up / sign in with protected routes |

---

## Tech Stack

### Core Framework
| Technology | Role |
|-----------|------|
| **Next.js 16** | App Router, API routes, SSR |
| **React 19** | UI layer |
| **TypeScript 5** | Full type safety across codebase |
| **Tailwind CSS 4** | Utility-first styling |
| **Framer Motion** | UI animations and transitions |

### AI & LLM
| Technology | Role |
|-----------|------|
| **Groq API** (`llama-3.3-70b-versatile`) | Resume analysis, question generation, answer evaluation |
| **FastEmbed** (`BAAI/bge-small-en-v1.5`) | Local ONNX-based text embeddings — 384 dimensions, cosine similarity |
| **LangGraph** (`@langchain/langgraph`) | 6-node stateful interview graph — retrieve → plan → generate → remember |
| **OpenAI Realtime API** | Speech → transcript pipeline |

### Database & Vector Search
| Technology | Role |
|-----------|------|
| **MongoDB Atlas** | Primary database for users, resume insights, interview answers |
| **MongoDB Atlas Vector Search** | `$vectorSearch` aggregation on resume chunks and conversation memory |

### Auth & Infrastructure
| Technology | Role |
|-----------|------|
| **Clerk** | Authentication, user sessions, protected routes |
| **Vercel Analytics** | Usage tracking |

### On-Device AI (Browser)
| Technology | Role |
|-----------|------|
| **MediaPipe Tasks Vision** | Face Landmarker — real-time face tracking per video frame |
| **ONNX Runtime Web** | Runs emotion classification model in the browser |
| **pdf-parse** | PDF text extraction server-side |
| **mammoth** | DOCX text extraction server-side |

---

## RAG Architecture

The RAG pipeline turns the interviewer from a stateless Q&A bot into a session-aware agent that remembers your resume and the entire conversation.

### Resume Pipeline (triggered on upload)

```
Upload Resume (PDF / DOCX / TXT)
        ↓
  extractResumeText()          ← pdf-parse / mammoth / utf-8
        ↓
  analyzeResumeWithGroq()      ← Groq LLM → structured insights JSON
        ↓
  chunkResumeText()            ← section-aware chunker
        │                         Priority: Projects → Experience → Skills
        │                         → Education → Certifications → ...
        │                         Fallback: sentence-level, 300-char chunks
        ↓
  embedTexts()                 ← FastEmbed BAAI/bge-small-en-v1.5
        ↓
  upsertResumeChunks()         → MongoDB Atlas `resume_chunks` collection
                                  (replaces old chunks, stores 384-dim vectors)
```

### Interview Turn Pipeline (per candidate answer)

The pipeline has **two phases** separated by whether `latestAnswer` is present.

#### Phase 1 — Session Opener (Turn 0, no latestAnswer)

```
Client calls POST /api/interview/rag-question  { latestAnswer: "" }
        │
        └─ Intro gate fires immediately (no LangGraph, no embeddings)
                ↓
        Returns:
          "Tell me about yourself. Please share your background,
           key experiences, and what you're looking for in your next role."
          { isIntroQuestion: true, currentTopic: 'Introduction' }
```

#### Phase 2 — RAG Questions (Turn 1 onwards, latestAnswer present)

```
Candidate answers intro → Transcript sent as latestAnswer
        ↓
  runInterviewRAG()            ← LangGraph 6-node graph
        │
        ├─ [Node 1] retrieveResume
        │       Embed latestAnswer → $vectorSearch resume_chunks
        │       Filter: userId    → Top 3 resume chunks
        │
        ├─ [Node 2] retrieveConversation
        │       Embed "Q: ...\nA: ..." → $vectorSearch conversation_memory_chunks
        │       Filter: userId + sessionId → Top 3 similar past turns
        │
        ├─ [Node 3] fetchRecentMemory
        │       Direct MongoDB find → sort createdAt desc → last 5 turns
        │       ⚠️ NEVER uses vector search
        │
        ├─ [Node 4] planner
        │       Heuristic decision:
        │         currentTopic === 'Introduction' → change_topic  (post-intro pivot)
        │         Short answer (<15 words)        → simplify
        │         3+ questions on topic           → change_topic
        │         Every 2 questions               → increase_difficulty
        │         Otherwise                       → follow_up
        │
        ├─ [Node 5] questionGenerator
        │       Builds full context prompt → Groq
        │       NEVER repeats intro question (hard-coded rule in prompt)
        │       If currentTopic is empty: "Pick the most interesting
        │         topic from the Resume Context and ask a technical question"
        │       Returns exactly ONE question
        │
        └─ [Node 6] saveMemory
                Embed "Q: ...\nA: ..." → storeConversationTurn()
                → MongoDB conversation_memory_chunks
                Increments questionCount, infers topic from question text
        ↓
  { generatedQuestion, updatedInterviewState }
```

#### 3-Layer Intro Protection

| Layer | Location | Guard |
|-------|----------|-------|
| API gate | `rag-question/route.ts` | `if (!latestAnswer)` → return intro immediately |
| Planner pivot | `nodes/planner.ts` | `if (currentTopic === 'Introduction')` → force `change_topic` |
| Generator guard | `nodes/questionGenerator.ts` | `if (!latestAnswer)` → return intro without Groq call |

### Groq Prompt Structure

```
SYSTEM: You are a Senior Technical Interviewer.

=== Resume Context ===
[Top 3 resume chunks, grouped by section]

=== Relevant Previous Interview Turns ===
[Top 3 semantically similar prior Q&A pairs]

=== Recent Conversation ===
[Last 5 turns in chronological order]

=== Interview State ===
Current Topic    : React
Difficulty       : Medium
Questions Asked  : 4
Covered Topics   : JavaScript, Node.js
Planner Decision : increase_difficulty

USER: Current Question: ...
      Latest Candidate Answer: ...
      Generate the next interview question:
```

### MongoDB Collections

| Collection | Purpose | Vector Index |
|-----------|---------|-------------|
| `resume_chunks` | Chunked resume text with embeddings | `resume_vector_index` (userId filter) |
| `conversation_memory_chunks` | Per-session Q&A turns with embeddings | `conversation_vector_index` (userId + sessionId filters) |
| `resumeInsights` | Full structured resume analysis (JSON) | — |
| `interviewAnswerEvaluations` | Per-answer scores, feedback, behavior metrics | — |

---

## Project Structure

```
Agentic_Interviewer/
├── app/
│   ├── api/
│   │   ├── resume/
│   │   │   └── route.ts           GET / POST / PATCH resume insights
│   │   └── interview/
│   │       ├── questions/         Generate interview questions (Groq)
│   │       ├── transcribe/        Audio → text transcription
│   │       ├── evaluate/          Score candidate answer (Groq + DB)
│   │       ├── scores/            Fetch session scores
│   │       └── rag-question/      RAG-powered adaptive question generation
│   ├── [auth]/                    Clerk auth pages
│   ├── dashboard/                 User dashboard
│   ├── interview/                 Live interview experience
│   ├── profile/                   Resume upload + insights
│   ├── insights/                  Performance review
│   ├── features/ demo/ how-it-works/  Marketing pages
│   └── layout.tsx                 Root layout + PWA registration
│
├── components/
│   ├── landing/                   Landing page sections
│   └── ui/                        Reusable UI primitives (shadcn)
│
├── lib/
│   ├── mongodb.ts                 Singleton MongoClient connection
│   ├── resume-parser.ts           PDF / DOCX / TXT text extraction
│   ├── resume-analysis.ts         Groq LLM resume + interview helpers
│   ├── behavior-analysis.ts       MediaPipe + ONNX emotion scoring
│   ├── behavior-metrics.ts        BehaviorMetrics type definitions
│   ├── utils.ts                   Shared utilities
│   └── rag/
│       ├── embedder.ts            FastEmbed BAAI/bge-small-en-v1.5 singleton
│       ├── chunker.ts             Section-aware resume chunker
│       ├── vector-store.ts        Atlas $vectorSearch + direct fetch helpers
│       ├── retriever.ts           Parallel retrieval orchestration
│       ├── context-builder.ts     Format retrieved context for Groq
│       └── index.ts               Public API + embedAndStoreResume()
│
├── langgraph/
│   ├── graph.ts                   StateGraph (Annotation API) + runInterviewRAG()
│   └── nodes/
│       ├── retrieveResume.ts      Node 1: resume vector search
│       ├── retrieveConversation.ts Node 2: conversation vector search
│       ├── fetchRecentMemory.ts   Node 3: direct MongoDB recent turns
│       ├── planner.ts             Node 4: heuristic interview planner
│       ├── questionGenerator.ts   Node 5: Groq question generation
│       └── saveMemory.ts          Node 6: embed + store Q&A turn
│
├── models/
│   ├── InterviewState.ts          Session state (topic, difficulty, planner)
│   ├── ResumeChunk.ts             resume_chunks document shape
│   └── ConversationMemory.ts      conversation_memory_chunks document shape
│
└── public/                        Static assets, PWA icons, service worker
```

---

## API Reference

### `POST /api/resume`
Upload a resume file. Triggers Groq analysis + RAG embedding pipeline.

**Form data:** `resume` (File), `jobDescription` (string, optional)

**Response:**
```json
{
  "insights": { "summary": "...", "skills": [], "strengths": [], ... },
  "updatedAt": "ISO timestamp",
  "jobDescription": "..."
}
```

---

### `GET /api/resume`
Fetch the current user's stored resume insights.

---

### `PATCH /api/resume`
Update job description only (no re-analysis).

---

### `POST /api/interview/rag-question`
Generate the next adaptive interview question using the full LangGraph RAG pipeline.

**Turn 0 — First call (session opener)**

Omit `latestAnswer` (or send an empty string). The API returns the intro question immediately — **no LangGraph graph is invoked**, no embeddings are computed.

```json
// Request
{
  "sessionId": "session_abc123",
  "currentQuestion": "",
  "latestAnswer": "",
  "interviewState": null
}

// Response
{
  "generatedQuestion": "Tell me about yourself. Please share your background, key experiences, and what you're looking for in your next role.",
  "skillFocus": "Introduction & Communication",
  "isIntroQuestion": true,
  "updatedInterviewState": {
    "currentTopic": "Introduction",
    "difficulty": "Easy",
    "coveredTopics": [],
    "questionCount": 0,
    "plannerAction": "stay_on_topic",
    "sessionId": "session_abc123",
    "userId": "user_xyz"
  }
}
```

**Turn 1+ — RAG-powered questions**

Send the intro question as `currentQuestion` and the candidate's answer as `latestAnswer`. The full 6-node LangGraph pipeline runs.

```json
// Request
{
  "sessionId": "session_abc123",
  "currentQuestion": "Tell me about yourself...",
  "latestAnswer": "I'm a full-stack developer with 3 years of experience in React and Node.js...",
  "interviewState": { "currentTopic": "Introduction", "difficulty": "Easy", "questionCount": 0, ... }
}

// Response
{
  "generatedQuestion": "I see you've worked on real-time systems — can you walk me through the WebSocket architecture you used in your most recent project?",
  "updatedInterviewState": {
    "currentTopic": "System Design",
    "difficulty": "Easy",
    "coveredTopics": ["Introduction"],
    "questionCount": 1,
    "plannerAction": "change_topic",
    "sessionId": "session_abc123",
    "userId": "user_xyz"
  }
}
```

---

### `POST /api/interview/evaluate`
Evaluate a candidate's answer with Groq. Stores result + behavior metrics in DB.

**Request:**
```json
{
  "currentQuestion": "...",
  "userAnswer": "...",
  "behaviorMetrics": { "confidenceScore": 82, ... }
}
```

---

### `POST /api/interview/questions`
Generate a set of interview questions from resume insights (non-RAG, upfront generation).

---

### `POST /api/interview/transcribe`
Transcribe recorded audio to text.

---

### `GET /api/interview/scores`
Fetch all scored answers for the current user's session.

---

## Environment Variables

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Groq LLM
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile   # optional, this is the default

# MongoDB
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=agentic_interviewer  # optional, this is the default
```

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set environment variables

Create `.env.local` with the variables listed above.

### 3. Create MongoDB Atlas Vector Search Indexes

> ⚠️ **Required before the RAG pipeline works.** Create these in **Atlas UI → Atlas Search → Create Search Index → Atlas Vector Search (JSON editor)**.

**Collection: `resume_chunks`** — Index name: `resume_vector_index`

```json
{
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 384, "similarity": "cosine" },
    { "type": "filter", "path": "userId" }
  ]
}
```

**Collection: `conversation_memory_chunks`** — Index name: `conversation_vector_index`

```json
{
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 384, "similarity": "cosine" },
    { "type": "filter", "path": "userId" },
    { "type": "filter", "path": "sessionId" }
  ]
}
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:8000](http://localhost:8000)

> **Note:** FastEmbed downloads the `BAAI/bge-small-en-v1.5` ONNX model (~100 MB) on the first resume upload. This is a one-time download cached locally.

---

## Available Scripts

```bash
npm run dev       # Start dev server on port 8000
npm run build     # Production build
npm run start     # Start production server on port 8000
npm run lint      # Biome lint
npm run format    # Biome format
npm run check     # Biome lint + format check
```

---

## Behavior Analysis (On-Device)

The interview page runs a real-time behavior analysis pipeline entirely in the browser — no data leaves the device.

**Pipeline:**
1. **MediaPipe Face Landmarker** tracks face landmarks at 30 fps from the webcam feed
2. **ONNX Runtime Web** runs the emotion classification model on each frame
3. Softmax probabilities are aggregated per answer into `BehaviorMetrics`

**Output fields:**
- `confidenceScore` (0–100)
- `confidenceLabel` (e.g. `"Very confident"`)
- `confidenceSummary` (short sentence)
- Per-emotion aggregates (neutral, happy, surprised, fearful, etc.)
- `facePresentRatio` — fraction of frames where a face was detected

**Required public assets:**
- MediaPipe Face Landmarker WASM + model asset files in `public/`
- Emotion ONNX model in `public/`

If you swap the emotion model, update the input shape and label order in [`lib/behavior-analysis.ts`](lib/behavior-analysis.ts).

---

## PWA (Progressive Web App)

- Web manifest at `/manifest.webmanifest` (generated by `app/manifest.ts`)
- Service worker at `public/sw.js`, registered in production via `app/layout.tsx`
- Add maskable icons to `public/` and update `app/manifest.ts` for full Android/iOS PWA support

---

## Main Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | Sign in |
| `/signup` | Sign up |
| `/dashboard` | User dashboard + session history |
| `/profile` | Resume upload + insights panel |
| `/interview` | Live interview session (video + voice + RAG) |
| `/insights` | Post-interview performance review |
| `/features` | Feature showcase |
| `/demo` | Demo section |
| `/how-it-works` | Explainer |

---

## Deployment

Deployed on Vercel: [https://intervoo.vercel.app/](https://intervoo.vercel.app/)

Ensure all environment variables are set in your Vercel project settings and that your MongoDB Atlas cluster allows connections from Vercel's IP ranges (or use `0.0.0.0/0` for development).

---

## InterviewState — Session Continuity

Every interview session is tracked via an `InterviewState` object passed between API calls. The client stores this after each response and sends it back on the next request.

```typescript
{
  currentTopic: "React",           // topic currently under discussion
                                   // 'Introduction' on turn 0
                                   // '' after intro (planner resets for first RAG pivot)
  difficulty: "Medium",            // Easy | Medium | Hard
  coveredTopics: ["Introduction"], // topics fully exhausted — never revisited
  questionCount: 4,                // total questions asked (incremented in saveMemory)
  plannerAction: "follow_up",      // last planner decision:
                                   //   stay_on_topic | follow_up | increase_difficulty
                                   //   | simplify | change_topic
  sessionId: "session_abc123",     // scopes conversation_memory_chunks retrieval
  userId: "user_xyz"               // Clerk userId
}
```

### Planner Decision Logic

| Condition | Action | Effect |
|-----------|--------|--------|
| `currentTopic === 'Introduction'` | `change_topic` | Marks intro as covered, clears topic, generator picks from resume |
| Answer length < 15 words | `simplify` | Lowers difficulty one step |
| 3+ turns on same topic | `change_topic` | Pushes current topic to `coveredTopics`, resets topic |
| `questionCount % 2 === 0` | `increase_difficulty` | Steps up Easy → Medium → Hard |
| Default | `follow_up` | Stays on current topic, deepens the question |
