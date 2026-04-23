import Groq from 'groq-sdk';

export type ResumeInsights = {
  summary: string;
  skills: string[];
  strengths: string[];
  improvementAreas: string[];
  suggestedRoles: string[];
  interviewFocus: string[];
  estimatedExperienceYears: number;
  atsScore: number;
};

export type InterviewQuestion = {
  question: string;
  skillFocus: string;
};

export type InterviewDifficulty = 'easy' | 'medium' | 'hard';

export const INTRO_INTERVIEW_QUESTION: InterviewQuestion = {
  question:
    "Tell me about yourself. Please share your background, key experiences, and what you're looking for in your next role.",
  skillFocus: 'Introduction & Communication',
};

export type AnswerEvaluation = {
  score: number;
  strengths: string[];
  improvementAreas: string[];
  feedbackSummary: string;
  followUpQuestion: string;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function computeFallbackAtsScore(candidate: Record<string, unknown>): number {
  const skills = asStringArray(candidate.skills);
  const strengths = asStringArray(candidate.strengths);
  const improvementAreas = asStringArray(candidate.improvementAreas);
  const suggestedRoles = asStringArray(candidate.suggestedRoles);

  const estimatedExperienceYearsRaw =
    typeof candidate.estimatedExperienceYears === 'number'
      ? candidate.estimatedExperienceYears
      : Number(candidate.estimatedExperienceYears ?? 0);

  const estimatedExperienceYears = Number.isFinite(estimatedExperienceYearsRaw)
    ? Math.max(0, Math.min(50, Math.round(estimatedExperienceYearsRaw)))
    : 0;

  const computed =
    55 +
    Math.min(skills.length, 12) * 2 +
    Math.min(strengths.length, 8) * 2 +
    Math.min(suggestedRoles.length, 5) +
    Math.min(Math.floor(estimatedExperienceYears / 2), 8) -
    Math.min(improvementAreas.length, 8) * 2;

  return Math.max(35, Math.min(95, Math.round(computed)));
}

function sanitizeInsights(raw: unknown): ResumeInsights {
  const candidate = (raw || {}) as Record<string, unknown>;
  const atsScoreRaw =
    typeof candidate.atsScore === 'number' ? candidate.atsScore : Number(candidate.atsScore ?? 0);
  const hasValidAtsScore = Number.isFinite(atsScoreRaw) && atsScoreRaw > 0;

  return {
    summary:
      typeof candidate.summary === 'string' && candidate.summary.trim().length > 0
        ? candidate.summary.trim()
        : 'No summary generated.',
    skills: asStringArray(candidate.skills),
    strengths: asStringArray(candidate.strengths),
    improvementAreas: asStringArray(candidate.improvementAreas),
    suggestedRoles: asStringArray(candidate.suggestedRoles),
    interviewFocus: asStringArray(candidate.interviewFocus),
    estimatedExperienceYears:
      typeof candidate.estimatedExperienceYears === 'number'
        ? Math.max(0, Math.min(50, Math.round(candidate.estimatedExperienceYears)))
        : 0,
    atsScore: hasValidAtsScore
      ? Math.max(0, Math.min(100, Math.round(atsScoreRaw)))
      : computeFallbackAtsScore(candidate),
  };
}

export function normalizeResumeInsights(raw: unknown): ResumeInsights {
  return sanitizeInsights(raw);
}

function sanitizeQuestions(raw: unknown): InterviewQuestion[] {
  const candidate = (raw || {}) as Record<string, unknown>;
  const questionsRaw = Array.isArray(candidate.questions) ? candidate.questions : [];

  const questions = questionsRaw
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const entry = item as Record<string, unknown>;
      const question = typeof entry.question === 'string' ? entry.question.trim() : '';
      const skillFocus =
        typeof entry.skillFocus === 'string' ? entry.skillFocus.trim() : 'General communication';

      if (!question) {
        return null;
      }

      return { question, skillFocus };
    })
    .filter((item): item is InterviewQuestion => Boolean(item))
    .slice(0, 10);

  return questions;
}

export function ensureIntroQuestionFirst(
  questions: InterviewQuestion[],
  questionCount?: number,
): InterviewQuestion[] {
  const nonIntroQuestions = questions.filter((item) => {
    const normalized = item.question.trim().toLowerCase();
    return !(normalized.includes('tell me about yourself') || normalized.includes('introduce yourself'));
  });

  const ordered = [INTRO_INTERVIEW_QUESTION, ...nonIntroQuestions];

  if (typeof questionCount === 'number' && Number.isFinite(questionCount)) {
    return ordered.slice(0, Math.max(1, Math.round(questionCount)));
  }

  return ordered;
}

function sanitizeAnswerEvaluation(raw: unknown): AnswerEvaluation {
  const candidate = (raw || {}) as Record<string, unknown>;

  const scoreRaw =
    typeof candidate.score === 'number' ? candidate.score : Number(candidate.score ?? 0);

  const followUpQuestion =
    typeof candidate.followUpQuestion === 'string' && candidate.followUpQuestion.trim().length > 0
      ? candidate.followUpQuestion.trim()
      : 'Can you give a specific example from your past work for that answer?';

  return {
    score: Number.isFinite(scoreRaw) ? Math.max(0, Math.min(100, Math.round(scoreRaw))) : 0,
    strengths: asStringArray(candidate.strengths),
    improvementAreas: asStringArray(candidate.improvementAreas),
    feedbackSummary:
      typeof candidate.feedbackSummary === 'string' && candidate.feedbackSummary.trim().length > 0
        ? candidate.feedbackSummary.trim()
        : 'No feedback summary generated.',
    followUpQuestion,
  };
}

export async function analyzeResumeWithGroq(resumeText: string): Promise<ResumeInsights> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY in environment variables.');
  }

  const groq = new Groq({ apiKey });

  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are an expert resume analyzer for interview preparation. Return only valid JSON with fields: summary (string), skills (string[]), strengths (string[]), improvementAreas (string[]), suggestedRoles (string[]), interviewFocus (string[]), estimatedExperienceYears (number), atsScore (number 0-100). Keep arrays concise and practical.',
      },
      {
        role: 'user',
        content: `Analyze this resume text and generate interview coaching insights:\n\n${resumeText}`,
      },
    ],
  });

  const rawContent = completion.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(rawContent);

  return sanitizeInsights(parsed);
}

export async function generateInterviewQuestionsWithGroq(
  insights: ResumeInsights,
  questionCount = 6,
  difficulty: InterviewDifficulty = 'medium',
  jobDescription?: string,
): Promise<InterviewQuestion[]> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY in environment variables.');
  }

  const groq = new Groq({ apiKey });
  const normalizedJobDescription = typeof jobDescription === 'string' ? jobDescription.trim() : '';

  // Request one fewer question since we are adding the intro ourselves.
  const remainingQuestionCount = Math.max(1, questionCount - 1);

  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    temperature: 0.4,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are an interview coach. Return only valid JSON: {"questions":[{"question":"...","skillFocus":"..."}]}. If a job description is provided, align most questions to that role while grounding them in the candidate resume. If no job description is provided, use only resume strengths and gaps. Start with general/behavioral questions before jumping to technical ones.',
      },
      {
        role: 'user',
        content: `Create ${remainingQuestionCount} interview questions using this resume insight JSON:\n${JSON.stringify(insights)}\n\nJob description context (${normalizedJobDescription ? 'provided' : 'not provided'}):\n${normalizedJobDescription || 'No job description provided. Use resume context only.'}\n\nDifficulty level: ${difficulty}.\nRules: Start with general/behavioral questions then move to technical. Include mix of behavioral + technical + project-based questions. Keep each concise. When a job description is provided, prioritize required responsibilities and skills from it.\nDifficulty guidance:\n- easy: beginner-friendly, foundational concepts, direct phrasing, low complexity follow-ups.\n- medium: practical real-world scenarios, moderate depth, some trade-off discussion.\n- hard: senior-level depth, architecture/trade-offs, edge cases, performance and scaling considerations.`,
      },
    ],
  });

  const rawContent = completion.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(rawContent);
  const questions = sanitizeQuestions(parsed);

  if (questions.length === 0) {
    return [
      INTRO_INTERVIEW_QUESTION,
      {
        question: 'Tell me about a project where you solved a difficult technical problem.',
        skillFocus: 'Project storytelling',
      },
    ];
  }

  return ensureIntroQuestionFirst(questions, questionCount);
}

export async function evaluateAnswerWithGroq(input: {
  currentQuestion: string;
  userAnswer: string;
  resumeInsights: ResumeInsights;
}): Promise<AnswerEvaluation> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY in environment variables.');
  }

  const groq = new Groq({ apiKey });

  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are an interview evaluator. Return only JSON with fields: score (0-100), strengths (string[]), improvementAreas (string[]), feedbackSummary (string), followUpQuestion (string). Keep feedback concise and practical.',
      },
      {
        role: 'user',
        content: `Evaluate the candidate answer for interview coaching.\nQuestion: ${input.currentQuestion}\nAnswer: ${input.userAnswer}\nResumeInsights: ${JSON.stringify(input.resumeInsights)}`,
      },
    ],
  });

  const rawContent = completion.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(rawContent);
  return sanitizeAnswerEvaluation(parsed);
}
