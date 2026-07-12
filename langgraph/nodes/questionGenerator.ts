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
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('Missing GROQ_API_KEY');

  // ── Intro question safety guard ─────────────────────────────────────────
  // The API route already handles the first-turn case before invoking the
  // graph, but this guard ensures the intro question is always returned if
  // the graph is invoked with no latestAnswer (e.g. questionCount === 0).
  if (!state.latestAnswer?.trim()) {
    return { generatedQuestion: INTRO_INTERVIEW_QUESTION.question };
  }

  const groq = new Groq({ apiKey });

  // ── Build context blocks ────────────────────────────────────────────────
  const resumeContext = formatResumeContext(state.resumeChunks);
  const conversationMemoryContext = formatConversationMemoryContext(state.similarConversationTurns);
  const recentMemoryContext = formatRecentMemoryContext(state.recentTurns);
  const interviewStateContext = state.interviewState
    ? formatInterviewStateContext(state.interviewState)
    : 'Interview State: Not available';

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

  const generatedQuestion =
    completion.choices[0]?.message?.content?.trim() ||
    'Can you walk me through a challenging project you have worked on recently?';

  return { generatedQuestion };
}
