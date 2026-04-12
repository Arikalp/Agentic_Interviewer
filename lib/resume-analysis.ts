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
