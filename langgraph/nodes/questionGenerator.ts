/**
 * ============================================================
 * FILE: langgraph/nodes/questionGenerator.ts
 * PURPOSE: LangGraph Node 5 — generate the next interview question
 * ============================================================
 *
 * WHAT IT DOES:
 * Assembles a RAG-enriched prompt from all retrieved context
 * (resume chunks, similar turns, recent turns, interview state)
 * and calls the Groq LLM to generate exactly ONE adaptive
 * follow-up interview question.
 *
 * PROMPT STRATEGY:
 *  - System prompt = full RAG context blocks + strict instructions
 *  - User prompt   = the current question + the candidate's answer
 *  - Temperature   = 0.5 (balanced: creative but consistent)
 *  - max_tokens    = 200 (keeps questions concise)
 *
 * INTRO QUESTION GUARD:
 * If no latestAnswer is present (first turn), the intro question
 * constant is returned immediately without calling the LLM at all.
 * This avoids an unnecessary API call on the very first turn.
 *
 * FALLBACK:
 * If the Groq API returns nothing, a safe generic fallback question
 * is used so the interview never stalls.
 *
 * ENVIRONMENT VARIABLES:
 *  - GROQ_API_KEY : Required (throws if missing)
 *  - GROQ_MODEL   : Optional (defaults to 'llama-3.3-70b-versatile')
 * ============================================================
 */

import Groq from 'groq-sdk';
import {
  formatResumeContext,
  formatConversationMemoryContext,
  formatRecentMemoryContext,
  formatInterviewStateContext,
} from '@/lib/rag/context-builder';
import { INTRO_INTERVIEW_QUESTION } from '@/lib/resume-analysis';
import type { GraphState } from '@/langgraph/graph';

/**
 * Node: questionGenerator
 *
 * Builds the full RAG-enriched prompt and calls Groq to generate exactly
 * ONE adaptive follow-up interview question.
 *
 * Inputs from state:
 *   - resumeChunks              (from retrieveResume)
 *   - similarConversationTurns  (from retrieveConversation)
 *   - recentTurns               (from fetchRecentMemory)
 *   - latestAnswer              (current candidate answer)
 *   - currentQuestion           (current interview question)
 *   - interviewState            (from planner)
 *
 * Updates state.generatedQuestion.
 */
export async function questionGenerator(state: GraphState): Promise<Partial<GraphState>> {
  // Step 1: Validate that the GROQ API key is available
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('Missing GROQ_API_KEY');

  // ── Intro question safety guard ─────────────────────────────────────────
  // The API route already handles the first-turn case before invoking the
  // graph, but this guard ensures the intro question is always returned if
  // the graph is invoked with no latestAnswer (e.g. questionCount === 0).
  // Returning early avoids an unnecessary LLM call on the first turn.
  if (!state.latestAnswer?.trim()) {
    return { generatedQuestion: INTRO_INTERVIEW_QUESTION.question };
  }

  // Step 2: Initialize the Groq client using the API key
  const groq = new Groq({ apiKey });

  // Step 3: Format all retrieved context into readable blocks for the prompt.
  // Each formatter takes the raw data and returns a labelled text block.
  // ── Build context blocks ────────────────────────────────────────────────
  const resumeContext = formatResumeContext(state.resumeChunks);
  const conversationMemoryContext = formatConversationMemoryContext(state.similarConversationTurns);
  const recentMemoryContext = formatRecentMemoryContext(state.recentTurns);
  const interviewStateContext = state.interviewState
    ? formatInterviewStateContext(state.interviewState)
    : 'Interview State: Not available';

  // Determine if we are in a topic-change situation (planner set currentTopic to '')
  // This changes the instruction in the system prompt accordingly
  // ── Prompt ──────────────────────────────────────────────────────────────
  const hasNoTopic = !state.interviewState?.currentTopic ||
    state.interviewState.currentTopic === '';

  const systemPrompt = `You are a Senior Technical Interviewer conducting a live technical interview.

${resumeContext}

${conversationMemoryContext}

${recentMemoryContext}

${interviewStateContext}

Instructions:
- Ask exactly ONE follow-up question.
- NEVER ask "Tell me about yourself" or any introduction question — that has already been asked.
- ${hasNoTopic
    ? 'The candidate just finished their introduction. Pick the most interesting topic from the Resume Context above and ask a specific technical question about it.'
    : 'Continue the current topic when possible.'
  }
- Increase difficulty gradually based on the Interview State.
- Never repeat a question already asked in the Recent Conversation.
- If the candidate is struggling (short or vague answer), simplify the question.
- If the current topic is exhausted, pivot to a new topic from the candidate's resume.
- Sound like a real senior interviewer — concise, professional, no filler.
- Return ONLY the question text. No explanations, no preambles.`;

  const userPrompt = `Current Question: ${state.currentQuestion || 'Introduction complete — ask the first technical question'}

Latest Candidate Answer: ${state.latestAnswer}

Generate the next interview question:`;

  // Step 4: Call the Groq LLM with the assembled prompt.
  // temperature=0.5 balances creativity with consistency.
  // max_tokens=200 keeps questions short and focused.
  // ── Groq call ───────────────────────────────────────────────────────────
  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    temperature: 0.5,
    max_tokens: 200,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  // Step 5: Extract the generated question from the LLM response.
  // The `|| '...'` fallback ensures the interview never stalls if the
  // model returns an empty response.
  const generatedQuestion =
    completion.choices[0]?.message?.content?.trim() ||
    'Can you walk me through a challenging project you have worked on recently?';

  return { generatedQuestion };
}
