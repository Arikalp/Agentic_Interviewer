/**
 * ============================================================
 * FILE: lib/rag/context-builder.ts
 * PURPOSE: Format retrieved RAG data into readable prompt blocks
 * ============================================================
 *
 * This module converts raw data from MongoDB into human-readable
 * text blocks that are injected into the LLM's system prompt.
 *
 * Each formatter function takes one type of retrieved data and
 * returns a labelled text block.
 *
 * FOUR CONTEXT SOURCES:
 *  1. resumeContext            : Top resume chunks (from vector search)
 *  2. conversationMemoryContext: Semantically similar past Q&A turns
 *  3. recentMemoryContext      : Last 5 turns chronologically
 *  4. interviewStateContext    : Current topic/difficulty/count
 *
 * CRITICAL DESIGN RULE:
 *  - conversationMemoryContext = retrieved by VECTOR SEARCH
 *  - recentMemoryContext       = retrieved by DIRECT SORT
 * These serve different purposes and must NOT be confused.
 *
 * USAGE:
 *   import { formatResumeContext } from '@/lib/rag/context-builder';
 *   const block = formatResumeContext(chunks);
 *   // inject `block` into the system prompt
 * ============================================================
 */

import type { ResumeChunk } from '@/models/ResumeChunk';
import type { ConversationMemory } from '@/models/ConversationMemory';
import type { InterviewState } from '@/models/InterviewState';

/**
 * The fully-assembled context object passed into the LangGraph question generator.
 */
export interface RAGContext {
  resumeContext: string;
  conversationMemoryContext: string;
  recentMemoryContext: string;
  interviewStateContext: string;
}

// ---------------------------------------------------------------------------
// Individual context formatters
// ---------------------------------------------------------------------------

/**
 * formatResumeContext
 * -------------------
 * Formats the top resume chunks into a readable block for the LLM.
 * Groups chunks by section so the LLM sees them organized
 * (e.g., all "Projects" entries together).
 *
 * OUTPUT FORMAT:
 *   === Resume Context ===
 *   [Projects]
 *     • Built a React dashboard...
 *     • Deployed on Vercel...
 *   [Skills]
 *     • TypeScript, Node.js, MongoDB
 *
 * @param chunks - Top-K resume chunks from vector search.
 * @returns      - Formatted string block for the system prompt.
 */
export function formatResumeContext(chunks: ResumeChunk[]): string {
  // Return a placeholder when no relevant resume sections were found
  if (chunks.length === 0) return 'No resume context available.';

  // Group by section to present related content together
  const grouped: Record<string, string[]> = {};
  for (const chunk of chunks) {
    if (!grouped[chunk.section]) grouped[chunk.section] = [];
    grouped[chunk.section].push(chunk.text);
  }

  const lines: string[] = ['=== Resume Context ==='];
  for (const [section, texts] of Object.entries(grouped)) {
    lines.push(`\n[${section}]`);
    for (const text of texts) {
      lines.push(`  • ${text}`);
    }
  }

  return lines.join('\n');
}

/**
 * formatConversationMemoryContext
 * --------------------------------
 * Formats vector-searched conversation turns (LONG-TERM MEMORY).
 * These are Q&A pairs that are SEMANTICALLY SIMILAR to the current
 * question/answer — they may not be recent, but they are topically
 * relevant. Helps the LLM avoid asking similar questions again.
 *
 * @param turns - Semantically similar prior Q&A turns.
 * @returns     - Formatted string block for the system prompt.
 */
export function formatConversationMemoryContext(turns: ConversationMemory[]): string {
  if (turns.length === 0) return 'No relevant previous interview turns found.';

  const lines: string[] = ['=== Relevant Previous Interview Turns ==='];
  for (const turn of turns) {
    lines.push(`\n${turn.combinedText}`);
  }

  return lines.join('\n');
}

/**
 * formatRecentMemoryContext
 * -------------------------
 * Formats the last 3–5 conversation turns (RECENT/SHORT-TERM MEMORY).
 * These are always fetched by direct MongoDB sort, NOT vector search.
 * They give the LLM the most recent conversation context for
 * natural conversational flow and to avoid repeating recent questions.
 *
 * @param turns - Chronologically ordered recent Q&A turns.
 * @returns     - Formatted string block for the system prompt.
 */
export function formatRecentMemoryContext(turns: ConversationMemory[]): string {
  // On the very first turn, there is no prior conversation
  if (turns.length === 0) return 'This is the start of the interview.';

  const lines: string[] = ['=== Recent Conversation ==='];
  for (const turn of turns) {
    lines.push(`\n${turn.combinedText}`);
  }

  return lines.join('\n');
}

/**
 * formatInterviewStateContext
 * ---------------------------
 * Formats the current InterviewState into a short status block.
 * The LLM uses this to understand the current topic, difficulty,
 * how many questions have been asked, and what strategy to use.
 *
 * @param state - Current interview state from the planner.
 * @returns     - Formatted string block for the system prompt.
 */
export function formatInterviewStateContext(state: InterviewState): string {
  return [
    '=== Interview State ===',
    `Current Topic    : ${state.currentTopic || 'Not yet determined'}`,
    `Difficulty       : ${state.difficulty}`,
    `Questions Asked  : ${state.questionCount}`,
    `Covered Topics   : ${state.coveredTopics.length > 0 ? state.coveredTopics.join(', ') : 'None yet'}`,
    `Planner Decision : ${state.plannerAction}`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Main builder
// ---------------------------------------------------------------------------

/**
 * buildRAGContext
 * ---------------
 * Orchestrates all four formatters into a single `RAGContext` object.
 * This is the one-stop function for assembling the complete prompt
 * context from all retrieved data sources at once.
 *
 * @param resumeChunks   - Top resume chunks from vector search.
 * @param similarTurns   - Semantically similar prior Q&A turns.
 * @param recentTurns    - Chronologically recent Q&A turns.
 * @param interviewState - Current interview state.
 * @returns              - Fully assembled RAGContext object.
 */
export function buildRAGContext(
  resumeChunks: ResumeChunk[],
  similarTurns: ConversationMemory[],
  recentTurns: ConversationMemory[],
  interviewState: InterviewState,
): RAGContext {
  return {
    resumeContext: formatResumeContext(resumeChunks),
    conversationMemoryContext: formatConversationMemoryContext(similarTurns),
    recentMemoryContext: formatRecentMemoryContext(recentTurns),
    interviewStateContext: formatInterviewStateContext(interviewState),
  };
}
