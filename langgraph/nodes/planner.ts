import type { GraphState } from '@/langgraph/graph';
import type { PlannerAction, InterviewDifficulty } from '@/models/InterviewState';

/**
 * Node: planner
 *
 * Analyzes the current InterviewState + retrieved context to decide
 * what type of question to ask next.
 *
 * Decisions:
 *   - stay_on_topic    : Continue probing the same topic
 *   - follow_up        : Deeper follow-up on the candidate's last answer
 *   - increase_difficulty : Move to a harder variant of the topic
 *   - simplify         : Candidate is struggling — ease the difficulty
 *   - change_topic     : Topic exhausted — pivot to a new resume section
 *
 * Updates state.interviewState with the new plannerAction and difficulty.
 *
 * This node uses heuristic rules only (no LLM call) to keep latency low.
 */
export async function planner(state: GraphState): Promise<Partial<GraphState>> {
  const { interviewState, recentTurns, latestAnswer } = state;

  if (!interviewState) {
    return {};
  }

  const currentTopic = interviewState.currentTopic;
  const difficulty = interviewState.difficulty;
  const questionCount = interviewState.questionCount;

  // ── Heuristic scoring ──────────────────────────────────────────────────

  // How long was the latest answer? Short answers may indicate struggle.
  const answerLength = latestAnswer?.trim().split(/\s+/).length ?? 0;
  const seemsStruggling = answerLength < 15;

  // How many questions have been asked on the current topic?
  const topicQCount = recentTurns.filter(
    (t) => t.question.toLowerCase().includes(currentTopic.toLowerCase()) && currentTopic,
  ).length;

  // ── Decision tree ──────────────────────────────────────────────────────

  let plannerAction: PlannerAction;
  let nextDifficulty: InterviewDifficulty = difficulty;
  let nextTopic = currentTopic;
  const coveredTopics = [...interviewState.coveredTopics];

  if (seemsStruggling) {
    // Candidate is struggling — simplify or stay at the same level
    plannerAction = 'simplify';
    nextDifficulty = difficulty === 'Hard' ? 'Medium' : difficulty === 'Medium' ? 'Easy' : 'Easy';
  } else if (topicQCount >= 3 && currentTopic) {
    // We've spent 3+ questions on this topic — move to a new one
    plannerAction = 'change_topic';
    if (!coveredTopics.includes(currentTopic)) {
      coveredTopics.push(currentTopic);
    }
    nextTopic = ''; // Generator will pick from resume context
  } else if (questionCount > 0 && questionCount % 2 === 0) {
    // Every 2 questions, increase difficulty
    plannerAction = 'increase_difficulty';
    nextDifficulty =
      difficulty === 'Easy' ? 'Medium' : difficulty === 'Medium' ? 'Hard' : 'Hard';
  } else if (!currentTopic) {
    // Very first question or topic reset
    plannerAction = 'stay_on_topic';
  } else {
    // Default: follow up on the last answer
    plannerAction = 'follow_up';
  }

  return {
    interviewState: {
      ...interviewState,
      plannerAction,
      difficulty: nextDifficulty,
      currentTopic: nextTopic,
      coveredTopics,
      questionCount: interviewState.questionCount, // incremented in saveMemory after generation
    },
  };
}
