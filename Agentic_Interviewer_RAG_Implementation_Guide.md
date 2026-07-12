# Agentic Interviewer RAG Implementation Guide

## Project Stack

-   Next.js
-   MongoDB Atlas
-   LangGraph
-   Groq API (LLM)
-   OpenAI Realtime API (Speech → Transcript)
-   FastEmbed
-   BAAI/bge-small-en-v1.5 (Embeddings)

------------------------------------------------------------------------

# Goal

Generate adaptive interview questions based on:

1.  Candidate Resume
2.  Previous Interview Questions & Answers

------------------------------------------------------------------------

# Final Architecture

``` text
Resume PDF
    │
    ▼
Parse Resume
    │
    ▼
Chunk Resume
    │
    ▼
Generate Embeddings (BGE-small)
    │
    ▼
MongoDB Atlas Vector Search
(resume_chunks)

======================================

Candidate Speaks
    │
    ▼
OpenAI Realtime Transcript
    │
    ▼
Question + Answer
    │
    ▼
Generate Embedding
    │
    ▼
MongoDB Atlas Vector Search
(conversation_memory_chunks)

======================================

LangGraph

↓

Retrieve Resume Chunks

+

Retrieve Similar Previous Q&A

+

Recent Conversation (Last 3–5 Turns)

↓

Groq

↓

Generate Next Question
```

------------------------------------------------------------------------

# MongoDB Collections

## resume_chunks

``` json
{
  "userId": "...",
  "section": "Projects",
  "text": "Built Typesto using Next.js and MongoDB.",
  "embedding": []
}
```

## conversation_memory_chunks

``` json
{
  "sessionId": "...",
  "question": "...",
  "answer": "...",
  "combinedText": "Q: ...\nA: ...",
  "embedding": [],
  "createdAt": "..."
}
```

------------------------------------------------------------------------

# MongoDB Vector Search Indexes

Create TWO Vector Search indexes.

## 1. resume_chunks

Index Name

    resume_vector_index

Settings

  Property     Value
  ------------ -----------
  Path         embedding
  Dimensions   384
  Similarity   Cosine

------------------------------------------------------------------------

## 2. conversation_memory_chunks

Index Name

    conversation_vector_index

Settings

  Property     Value
  ------------ -----------
  Path         embedding
  Dimensions   384
  Similarity   Cosine

No Filter Fields required initially.

------------------------------------------------------------------------

# Embedding Model

FastEmbed

Model

    BAAI/bge-small-en-v1.5

Dimensions

    384

Similarity

    Cosine

------------------------------------------------------------------------

# Retrieval Strategy

Every candidate answer:

``` text
Candidate Answer
        │
        ▼
Generate Embedding
        │
        ▼
Search resume_chunks
        │
        ▼
Top 3 Resume Chunks

+

Search conversation_memory_chunks
        │
        ▼
Top 3 Similar Previous Q&A

+

Fetch Last 3–5 Conversation Turns
(from MongoDB, not vector search)

↓

Merge Context

↓

Groq

↓

Generate Follow-up Question
```

------------------------------------------------------------------------

# LangGraph Flow

``` text
START

↓

Transcript

↓

Embedding Node

↓

Resume Retriever

↓

Conversation Retriever

↓

Fetch Recent Conversation

↓

Merge Context

↓

Question Generator

↓

Store Question + Answer

↓

WAIT

↓

Repeat
```

------------------------------------------------------------------------

# Prompt Template

``` text
SYSTEM

You are a Senior Technical Interviewer.

Resume Context

{resume_chunks}

Relevant Previous Interview Turns

{conversation_memory}

Recent Conversation

{last_3_turns}

Latest Candidate Answer

{current_answer}

Instructions

- Ask exactly ONE follow-up question.
- Avoid repetition.
- Prefer continuing the current topic.
- Increase difficulty gradually.
- If candidate struggles, simplify.
```

------------------------------------------------------------------------

# Folder Structure

``` text
/lib
    embedding.ts
    chunkResume.ts
    vectorSearch.ts
    rag.ts

/langgraph
    graph.ts
    nodes/
        embed.ts
        retrieve.ts
        planner.ts
        question.ts
        memory.ts

/models
    ResumeChunk.ts
    ConversationMemory.ts
```

------------------------------------------------------------------------

# Implementation Order

## Phase 1

-   Create MongoDB Vector Indexes
-   Chunk Resume
-   Generate Resume Embeddings
-   Store Resume Chunks

## Phase 2

-   Generate Embeddings for every Interview Turn
-   Store Conversation Memory

## Phase 3

-   Retrieve Resume Context
-   Retrieve Similar Previous Q&A
-   Merge Context

## Phase 4

-   Connect Retriever to LangGraph
-   Generate Adaptive Questions using Groq

------------------------------------------------------------------------

# Important Notes

-   Use **Vector Search**, not Atlas Search.
-   Use **Bring Your Own Embeddings**.
-   Use **Visual Editor**.
-   Vector Path: `embedding`
-   Dimensions: `384`
-   Similarity: `Cosine`
-   Keep the latest 3--5 conversation turns outside vector search and
    pass them directly to the LLM.
-   Store combined Question + Answer as the embedded text for
    conversation memory.
