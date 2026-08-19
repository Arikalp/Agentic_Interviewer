/**
 * InterviewState tracks the progression of a single interview session.
 * Updated by the Planner node after every question–answer turn to guide
 * topic selection, difficulty scaling, and follow-up logic.
 */

export type InterviewDifficulty = 'Easy' | 'Medium' | 'Hard';

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

/** Default state for a fresh interview session */
export function createInitialInterviewState(
  userId: string,
  sessionId: string,
): InterviewState {
  return {
    currentTopic: '',
    difficulty: 'Easy',
    coveredTopics: [],
    questionCount: 0,
    plannerAction: 'stay_on_topic',
    sessionId,
    userId,
  };
}
