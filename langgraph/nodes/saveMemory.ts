/**
 * ============================================================
 * FILE: langgraph/nodes/saveMemory.ts
 * PURPOSE: LangGraph Node 6 — store the completed Q&A turn
 * ============================================================
 *
 * WHAT IT DOES:
 * After the question generator produces the NEXT question, this
 * node stores the PREVIOUS turn (current question + answer) into
 * the `conversation_memory_chunks` collection with its embedding.
 *
 * EMBEDDING STRATEGY:
 * The combined string "Q: <question>\nA: <answer>" is embedded
 * so that future vector searches can find this turn by its full
 * semantic content (not just the question or just the answer).
 *
 * ADDITIONAL RESPONSIBILITIES:
 *  - Increments `interviewState.questionCount` by 1.
 *  - Infers and sets `interviewState.currentTopic` from the
 *    newly generated question (if topic was reset by planner).
 *
 * ERROR HANDLING:
 * Storage failure must NEVER crash the interview. A failed memory
 * write is caught, logged, and silently ignored. The candidate's
 * interview experience is not affected.
 * ============================================================
 */

import { embedTexts } from '@/lib/rag/embedder';
import { storeConversationTurn } from '@/lib/rag/vector-store';
import type { GraphState } from '@/langgraph/graph';

/**
 * Node: saveMemory
 *
 * After the question generator produces the next question, this node stores
 * the completed turn (previous question + candidate answer) into
 * `conversation_memory_chunks` with its embedding.
 *
 * Embedding is always generated from the combined Q+A text:
 *   "Q: <question>\nA: <answer>"
 *
 * Also increments interviewState.questionCount and updates currentTopic
 * if a new topic was chosen by the planner.
 *
 * Updates state.interviewState.
 */
export async function saveMemory(state: GraphState): Promise<Partial<GraphState>> {
  const { userId, sessionId, currentQuestion, latestAnswer, interviewState, generatedQuestion } =
    state;

  // Only store if we have a completed Q&A turn to save
  if (!currentQuestion || !latestAnswer || !userId || !sessionId) {
    return {};
  }

  try {
    // Step 1: Build the combined Q+A text in the exact format expected by vector search
    const combinedText = `Q: ${currentQuestion}\nA: ${latestAnswer}`;

    // Step 2: Generate the 384-dim embedding for this combined text.
    // `embedTexts([...])` returns an array — we destructure the first element.
    const [embedding] = await embedTexts([combinedText]);

    // Step 3: Determine the turn index for ordering within the session.
    // We use the current questionCount as a proxy (it's incremented below).
    // Determine turn index from the number of turns already stored
    // (use questionCount as a proxy — incremented below)
    const turnIndex = interviewState?.questionCount ?? 0;

    // Step 4: Insert the turn document into MongoDB
    await storeConversationTurn({
      sessionId,
      userId,
      question: currentQuestion,
      answer: latestAnswer,
      combinedText,
      embedding,
      turnIndex,
      createdAt: new Date(),
    });
  } catch (err) {
    // Memory storage failure should NEVER crash the interview.
    // Log it for debugging but do not re-throw.
    console.error('[RAG] saveMemory error:', err);
  }

  // Step 5: Update interviewState with incremented questionCount and new topic.
  // Update interviewState: increment question count and extract topic from the new question
  const updatedState = interviewState
    ? {
        ...interviewState,
        // Increment the question counter after each completed turn
        questionCount: interviewState.questionCount + 1,
        // If currentTopic is empty (topic was reset by planner), try to infer from the generated question.
        // `inferTopic()` does keyword matching against the question text.
        // If currentTopic is empty (topic was reset by planner), try to infer from the generated question
        currentTopic:
          interviewState.currentTopic ||
          inferTopic(generatedQuestion || ''),
      }
    : interviewState;

  return { interviewState: updatedState ?? undefined };
}

/**
 * inferTopic
 * ----------
 * Simple heuristic to infer a topic keyword from a generated question.
 * Used when the planner has reset currentTopic to '' after a topic change.
 * The questionGenerator picks the new topic from the resume, but the
 * planner doesn't know what topic was chosen. This function reads the
 * generated question and maps keywords to canonical topic labels.
 *
 * HOW IT WORKS:
 * 1. Lowercase the question text.
 * 2. Scan the topicMap for matching keywords.
 * 3. Return the first matching canonical label.
 * 4. Default to 'General' if no keyword matches.
 *
 * @param question - The generated question text from questionGenerator.
 * @returns        - A canonical topic label string.
 */
function inferTopic(question: string): string {
  const lower = question.toLowerCase();

  // Map of keyword fragments to canonical topic labels.
  // Order matters: more specific keywords should come before general ones.
  const topicMap: [string, string][] = [
    ['react', 'React'],
    ['next.js', 'Next.js'],
    ['node', 'Node.js'],
    ['typescript', 'TypeScript'],
    ['javascript', 'JavaScript'],
    ['python', 'Python'],
    ['sql', 'SQL'],
    ['mongo', 'MongoDB'],
    ['redis', 'Redis'],
    ['docker', 'Docker'],
    ['kubernetes', 'Kubernetes'],
    ['system design', 'System Design'],
    ['algorithm', 'Algorithms'],
    ['data structure', 'Data Structures'],
    ['machine learning', 'Machine Learning'],
    ['api', 'APIs'],
    ['rest', 'REST'],
    ['graphql', 'GraphQL'],
    ['testing', 'Testing'],
    ['ci/cd', 'CI/CD'],
    ['git', 'Git'],
  ];

  // Return the label for the first matching keyword
  for (const [keyword, label] of topicMap) {
    if (lower.includes(keyword)) return label;
  }

  // Fallback when no recognized technology keyword was found
  return 'General';
}
