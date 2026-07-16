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

  // Only store if we have a completed Q&A turn
  if (!currentQuestion || !latestAnswer || !userId || !sessionId) {
    return {};
  }

  try {
    const combinedText = `Q: ${currentQuestion}\nA: ${latestAnswer}`;
    const [embedding] = await embedTexts([combinedText]);

    // Determine turn index from the number of turns already stored
    // (use questionCount as a proxy — incremented below)
    const turnIndex = interviewState?.questionCount ?? 0;

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
    // Memory storage failure should never crash the interview
    console.error('[RAG] saveMemory error:', err);
  }

  // Update interviewState: increment question count and extract topic from the new question
  const updatedState = interviewState
    ? {
        ...interviewState,
        questionCount: interviewState.questionCount + 1,
        // If currentTopic is empty (topic was reset by planner), try to infer from the generated question
        currentTopic:
          interviewState.currentTopic ||
          inferTopic(generatedQuestion || ''),
      }
    : interviewState;

  return { interviewState: updatedState ?? undefined };
}

/**
 * Simple heuristic to infer a topic keyword from a question string.
 * Used when the planner resets currentTopic after a topic change.
 */
function inferTopic(question: string): string {
  const lower = question.toLowerCase();

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

  for (const [keyword, label] of topicMap) {
    if (lower.includes(keyword)) return label;
  }

  return 'General';
}
