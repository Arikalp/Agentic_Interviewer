/**
 * ============================================================
 * FILE: langgraph/nodes/planner.ts
 * PURPOSE: LangGraph Node 4 — decide what type of question to ask
 * ============================================================
 *
 * WHAT IT DOES:
 * Analyzes the current InterviewState + retrieved context to
 * decide the strategy for the NEXT question. This node uses
 * pure heuristic rules — NO LLM call — for fast, deterministic
 * low-latency decision making.
 *
 * DECISIONS IT MAKES (PlannerAction):
 *  - stay_on_topic      : Continue probing the same topic.
 *  - follow_up          : Dig deeper into the candidate's last answer.
 *  - increase_difficulty: Ask a harder question on the same topic.
 *  - simplify           : Candidate is struggling — ease the difficulty.
 *  - change_topic       : Topic exhausted — pivot to a new resume section.
 *
 * HEURISTICS USED:
 *  1. Short answers (< 15 words)     → 'simplify'
 *  2. 3+ questions on current topic  → 'change_topic'
 *  3. Every 2nd question             → 'increase_difficulty'
 *  4. currentTopic = 'Introduction'  → 'change_topic' (post-intro pivot)
 *  5. Default                        → 'follow_up'
 *
 * OUTPUT: Updates `state.interviewState` with the new plannerAction,
 * nextDifficulty, nextTopic, and updated coveredTopics list.
 * ============================================================
 */

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

  // SIGNAL 1: Answer length
  // Count words in the answer. If < 15 words, the candidate is likely
  // struggling, nervous, or didn't know the answer.
  const answerLength = latestAnswer?.trim().split(/\s+/).length ?? 0;
  const seemsStruggling = answerLength < 15;

  // SIGNAL 2: Topic question count
  // Count how many recent turns discussed the current topic.
  // When >= 3, we've exhausted this topic and should move on.
  const topicQCount = recentTurns.filter(
    (t) => t.question.toLowerCase().includes(currentTopic.toLowerCase()) && currentTopic,
  ).length;

  // ── Decision tree ──────────────────────────────────────────────────────

  let plannerAction: PlannerAction;
  let nextDifficulty: InterviewDifficulty = difficulty;
  let nextTopic = currentTopic;
  const coveredTopics = [...interviewState.coveredTopics];

  // ── Post-intro pivot ──────────────────────────────────────────────────────
  // After the candidate answers the intro question, mark 'Introduction' as
  // covered and force a topic change so the next question is resume-grounded.
  if (currentTopic === 'Introduction') {
    if (!coveredTopics.includes('Introduction')) {
      coveredTopics.push('Introduction');
    }
    plannerAction = 'change_topic';
    nextTopic = ''; // questionGenerator will pick a new topic from resume context
  } else if (seemsStruggling) {
    // RULE: Candidate answered with fewer than 15 words — simplify the next question.
    // Difficulty steps down one level (Hard→Medium→Easy; Easy stays Easy).
    plannerAction = 'simplify';
    nextDifficulty = difficulty === 'Hard' ? 'Medium' : difficulty === 'Medium' ? 'Easy' : 'Easy';
  } else if (topicQCount >= 3 && currentTopic) {
    // RULE: We've spent 3+ questions on this topic — time to change topics.
    // Mark it as covered and reset nextTopic so the generator picks a new one.
    plannerAction = 'change_topic';
    if (!coveredTopics.includes(currentTopic)) {
      coveredTopics.push(currentTopic);
    }
    nextTopic = ''; // Generator will pick from resume context
  } else if (questionCount > 0 && questionCount % 2 === 0) {
    // RULE: Every 2 questions, step up difficulty to keep the interview challenging.
    // Difficulty steps up one level (Easy→Medium→Hard; Hard stays Hard).
    plannerAction = 'increase_difficulty';
    nextDifficulty =
      difficulty === 'Easy' ? 'Medium' : difficulty === 'Medium' ? 'Hard' : 'Hard';
  } else if (!currentTopic) {
    // RULE: Very first question OR topic was just reset — stay neutral.
    plannerAction = 'stay_on_topic';
  } else {
    // DEFAULT: Follow up on the candidate's last answer for deeper exploration.
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
