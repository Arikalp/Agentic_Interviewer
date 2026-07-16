/**
 * ============================================================
 * FILE: models/InterviewState.ts
 * PURPOSE: Types and factory for tracking interview session state
 * ============================================================
 *
 * The InterviewState is the "brain" of a single interview session.
 * It tracks what topic is being discussed, how hard questions are,
 * what topics have already been covered, and what the planner
 * decided to do next.
 *
 * DATA FLOW:
 *  - Created by `createInitialInterviewState()` at session start.
 *  - Passed into the LangGraph via `GraphState.interviewState`.
 *  - Updated by the `planner` node on each Q&A turn.
 *  - Updated again by `saveMemory` to increment `questionCount`
 *    and infer the new topic from the generated question.
 *  - Persisted to MongoDB through the interview API route.
 *
 * RELATIONSHIPS:
 *  - ConversationMemory : stores the actual Q&A turns
 *  - ResumeChunk        : stores the resume vectors
 *  - InterviewState     : controls the interview logic flow
 * ============================================================
 */

/**
 * InterviewState tracks the progression of a single interview session.
 * Updated by the Planner node after every question–answer turn to guide
 * topic selection, difficulty scaling, and follow-up logic.
 */
/**
 * InterviewDifficulty
 * -------------------
 * Controls how hard the generated interview questions are.
 * The planner escalates difficulty every 2 questions and
 * simplifies when the candidate appears to be struggling.
 */
export type InterviewDifficulty = 'Easy' | 'Medium' | 'Hard';

/**
 * PlannerAction
 * -------------
 * The decision made by the `planner` LangGraph node about what
 * type of question to ask next. This directly drives the
 * `questionGenerator` prompt's instruction set.
 *
 * Values:
 *  - stay_on_topic       : Continue asking about the current topic.
 *  - increase_difficulty : Ask a harder question on the same topic.
 *  - change_topic        : Topic exhausted — pivot to a new resume section.
 *  - follow_up           : Dig deeper into the candidate's last answer.
 *  - simplify            : Candidate is struggling — ease the difficulty.
 */
export type PlannerAction =
  | 'stay_on_topic'
  | 'increase_difficulty'
  | 'change_topic'
  | 'follow_up'
  | 'simplify';

export interface InterviewState {
  /** The topic being actively discussed (e.g. "React", "System Design") */
  currentTopic: string;

  /** Current difficulty level */
  difficulty: InterviewDifficulty;

  /** All topics already covered in this session */
  coveredTopics: string[];

  /** Total number of questions asked so far */
  questionCount: number;

  /** What the planner decided for the next question */
  plannerAction: PlannerAction;

  /** The session identifier (same as sessionId in conversation memory) */
  sessionId: string;

  /** Clerk userId of the candidate */
  userId: string;
}

/**
 * createInitialInterviewState (EXPORTED)
 * ---------------------------------------
 * Factory function that creates a fresh, zeroed-out `InterviewState`
 * for a brand-new interview session.
 *
 * Called by the interview API route when it detects that no prior
 * interview state exists for the current session.
 *
 * Initial values:
 *  - currentTopic   : '' (empty — planner will set it after intro)
 *  - difficulty     : 'Easy' (always starts easy, escalates over time)
 *  - coveredTopics  : [] (no topics covered yet)
 *  - questionCount  : 0 (no questions asked yet)
 *  - plannerAction  : 'stay_on_topic' (neutral default)
 *
 * @param userId    - Clerk user ID for the authenticated candidate.
 * @param sessionId - Unique ID for this interview session.
 * @returns         - A valid initial InterviewState object.
 */
/** Default state for a fresh interview session */
export function createInitialInterviewState(
  userId: string,
  sessionId: string,
): InterviewState {
  return {
    currentTopic: '',         // Empty: planner sets topic after intro question
    difficulty: 'Easy',       // Always start with easy questions
    coveredTopics: [],        // No topics discussed yet
    questionCount: 0,         // No questions asked yet
    plannerAction: 'stay_on_topic', // Neutral default, overwritten on first turn
    sessionId,
    userId,
  };
}
