import Groq from 'groq-sdk';

export type ResumeInsights = {
  summary: string;
  skills: string[];
  strengths: string[];
  improvementAreas: string[];
  suggestedRoles: string[];
  interviewFocus: string[];
  estimatedExperienceYears: number;
};

export type InterviewQuestion = {
  question: string;
  skillFocus: string;
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

function sanitizeInsights(raw: unknown): ResumeInsights {
  const candidate = (raw || {}) as Record<string, unknown>;

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
  };
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
          'You are an expert resume analyzer for interview preparation. Return only valid JSON with fields: summary (string), skills (string[]), strengths (string[]), improvementAreas (string[]), suggestedRoles (string[]), interviewFocus (string[]), estimatedExperienceYears (number). Keep arrays concise and practical.',
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
): Promise<InterviewQuestion[]> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY in environment variables.');
  }

  const groq = new Groq({ apiKey });

  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    temperature: 0.4,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are an interview coach. Return only valid JSON: {"questions":[{"question":"...","skillFocus":"..."}]}. Questions must be practical interview prompts based on resume strengths and gaps.',
      },
      {
        role: 'user',
        content: `Create ${questionCount} interview questions using this resume insight JSON:\n${JSON.stringify(insights)}\n\nRules: include behavioral + technical + project-based questions and keep each concise.`,
      },
    ],
  });

  const rawContent = completion.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(rawContent);
  const questions = sanitizeQuestions(parsed);

  if (questions.length === 0) {
    return [
      {
        question: 'Tell me about a project where you solved a difficult technical problem.',
        skillFocus: 'Project storytelling',
      },
    ];
  }

  return questions;
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
