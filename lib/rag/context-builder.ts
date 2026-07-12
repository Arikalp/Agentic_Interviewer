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
 * Format top resume chunks into a readable block.
 * Groups chunks by section so the LLM sees them organized.
 */
export function formatResumeContext(chunks: ResumeChunk[]): string {
  if (chunks.length === 0) return 'No resume context available.';

  // Group by section
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
 * Format vector-searched conversation turns (long-term memory).
 * These are semantically similar prior Q&A pairs — not necessarily recent.
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
 * Format the last 3–5 conversation turns (recent memory).
 * This always comes from a direct DB fetch, not vector search.
 */
export function formatRecentMemoryContext(turns: ConversationMemory[]): string {
  if (turns.length === 0) return 'This is the start of the interview.';

  const lines: string[] = ['=== Recent Conversation ==='];
  for (const turn of turns) {
    lines.push(`\n${turn.combinedText}`);
  }

  return lines.join('\n');
}

/**
 * Format the current InterviewState so the planner/generator can read it.
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
 * Build the complete RAGContext from all retrieved memory sources.
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
