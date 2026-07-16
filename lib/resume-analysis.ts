/**
 * ============================================================
 * FILE: resume-analysis.ts
 * PURPOSE: AI-powered resume analysis and interview coaching
 * ============================================================
 *
 * This module is the BRAIN of the Agentic Interviewer system.
 * It connects to the GROQ AI service (which hosts large language
 * models like LLaMA 3.3) to perform three core tasks:
 *
 *  1. ANALYZE a candidate's resume -- extract skills, strengths,
 *     weaknesses, ATS score, and interview focus areas.
 *
 *  2. GENERATE tailored interview questions -- based on the resume
 *     analysis and optionally a job description.
 *
 *  3. EVALUATE candidate answers -- score them and provide feedback.
 *
 * All AI responses are raw JSON strings from the model. Because
 * the model can sometimes return malformed or partial data, every
 * response is passed through a "sanitize" function that cleans,
 * validates, and fills in safe default values before being used.
 *
 * Dependencies:
 *  - groq-sdk  : Official Node.js client for the GROQ API
 *  - process.env.GROQ_API_KEY  : Your GROQ API secret key
 *  - process.env.GROQ_MODEL    : (Optional) Model override, defaults
 *                                to 'llama-3.3-70b-versatile'
 * ============================================================
 */

import Groq from 'groq-sdk';

// -----------------------------------------------------------------
// SECTION 1: TYPE DEFINITIONS
// These TypeScript types describe the exact shape (structure) of
// objects that flow through the application. They act like contracts
// -- if a value does not match the type, TypeScript will show a
// compile-time error, preventing runtime bugs.
// -----------------------------------------------------------------
/**
 * ResumeInsights
 * --------------
 * The structured output produced after analyzing a resume.
 * This is the central data object used throughout the app:
 * it feeds into question generation and answer evaluation.
 *
 * Fields:
 *  - summary               : A short paragraph summarizing the candidate's profile.
 *  - skills                : Technical and soft skills extracted from the resume.
 *  - strengths             : What the candidate does particularly well.
 *  - improvementAreas      : Gaps or weaknesses that need to be addressed.
 *  - suggestedRoles        : Job titles this candidate would be a good fit for.
 *  - interviewFocus        : Topics the interviewer should probe (e.g., "system design").
 *  - estimatedExperienceYears : Total years of professional experience (0-50).
 *  - atsScore              : Applicant Tracking System score (0-100).
 *                            Higher = resume is more likely to pass ATS filters.
 */
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

/**
 * InterviewQuestion
 * -----------------
 * Represents a single interview question with context about
 * which skill it is designed to test.
 *
 * Fields:
 *  - question   : The actual interview question text.
 *  - skillFocus : The skill or competency being evaluated
 *                 (e.g., "System Design", "Teamwork", "React").
 */
export type InterviewQuestion = {
  question: string;
  skillFocus: string;
};

/**
 * InterviewDifficulty
 * -------------------
 * A union type (string literal union) that restricts the difficulty
 * setting to exactly three allowed values. Using a union type instead
 * of a plain `string` ensures callers cannot accidentally pass
 * "moderate" or "beginner".
 *
 *  - 'easy'   : Foundational concepts, beginner-friendly phrasing.
 *  - 'medium' : Real-world scenarios, moderate depth.
 *  - 'hard'   : Senior-level depth, architecture trade-offs, scaling.
 */
export type InterviewDifficulty = 'easy' | 'medium' | 'hard';

/**
 * INTRO_INTERVIEW_QUESTION
 * ------------------------
 * A constant (fixed, never changes) that holds the standard opening
 * question used at the start of EVERY interview session.
 *
 * Why a constant?
 * Because we always prepend this specific question before the
 * AI-generated ones, so it must be identical every time.
 * Centralizing it here avoids copy-paste inconsistencies across
 * different parts of the codebase.
 */
export const INTRO_INTERVIEW_QUESTION: InterviewQuestion = {
  question:
    "Tell me about yourself. Please share your background, key experiences, and what you're looking for in your next role.",
  skillFocus: 'Introduction & Communication',
};

/**
 * AnswerEvaluation
 * ----------------
 * The structured feedback object returned after the AI evaluates
 * a candidate's answer to an interview question.
 *
 * Fields:
 *  - score            : Overall score for the answer (0-100).
 *  - strengths        : What the candidate did well in the answer.
 *  - improvementAreas : Specific things that could be improved.
 *  - feedbackSummary  : A concise narrative evaluation of the answer.
 *  - followUpQuestion : The next question the interviewer should ask,
 *                       generated dynamically based on the answer given.
 */
export type AnswerEvaluation = {
  score: number;
  strengths: string[];
  improvementAreas: string[];
  feedbackSummary: string;
  followUpQuestion: string;
};

// -----------------------------------------------------------------
// SECTION 2: UTILITY / HELPER FUNCTIONS (private, not exported)
// These small, reusable functions handle data cleaning and validation.
// They are NOT exported because they are internal implementation
// details -- no outside module needs to call them directly.
// -----------------------------------------------------------------

/**
 * asStringArray
 * -------------
 * Safely converts an unknown value (from raw AI JSON output)
 * into a clean array of non-empty strings.
 *
 * WHY IS THIS NEEDED?
 * The AI model returns raw JSON. Sometimes a field that should be
 * a string array might be missing, null, or contain non-string
 * items (e.g., numbers, objects). This function guards against all
 * of those edge cases so the rest of the code never has to worry.
 *
 * HOW IT WORKS (step by step):
 *  1. If the value is not an array at all -> return empty array [].
 *  2. Filter out any items that are not strings (typeof !== 'string').
 *  3. Trim leading/trailing whitespace from each remaining string.
 *  4. Filter out any strings that became empty after trimming.
 *  5. Keep only the first 12 items (prevents excessively long lists).
 *
 * @param value - Any value from the raw AI JSON (unknown type for safety).
 * @returns     - A cleaned string array with at most 12 items.
 *
 * Example:
 *   asStringArray(["React", 42, "", "Node.js"])
 *   -> ["React", "Node.js"]  // 42 removed (not string), "" removed (empty)
 */
function asStringArray(value: unknown): string[] {
  // Guard: if it is not an array, we cannot safely iterate it.
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => typeof item === 'string') // Step 2: keep only strings
    .map((item) => item.trim())                 // Step 3: trim whitespace
    .filter(Boolean)                            // Step 4: remove empty strings (falsy)
    .slice(0, 12);                              // Step 5: cap at 12 items
}

/**
 * computeFallbackAtsScore
 * -----------------------
 * Calculates a deterministic (rule-based, not random) ATS score
 * using a weighted formula when the AI model fails to provide one.
 *
 * WHY IS THIS NEEDED?
 * The AI sometimes returns atsScore = 0 or omits it entirely.
 * Rather than showing the user a misleading "0", we compute a
 * reasonable estimate from the other fields in the insights data.
 *
 * FORMULA BREAKDOWN:
 *  Base score:        55   (everyone starts with a reasonable baseline)
 *  + Skills bonus:    up to +24  (each skill adds 2 pts, capped at 12)
 *  + Strengths bonus: up to +16  (each strength adds 2 pts, capped at 8)
 *  + Roles bonus:     up to +5   (each suggested role adds 1 pt, capped at 5)
 *  + Experience:      up to +8   (every 2 yrs of exp = 1 pt, capped at 16 yrs)
 *  - Improvement penalty: up to -16 (each gap subtracts 2 pts, capped at 8)
 *
 * Final result is clamped to [35, 95]:
 *  - Never lower than 35 (everyone gets some base credit)
 *  - Never higher than 95 (only real ATS tools can give a perfect 100)
 *
 * @param candidate - The raw parsed AI JSON object.
 * @returns         - An integer ATS score between 35 and 95.
 */
function computeFallbackAtsScore(candidate: Record<string, unknown>): number {
  // Extract each array field using our safe helper
  const skills = asStringArray(candidate.skills);
  const strengths = asStringArray(candidate.strengths);
  const improvementAreas = asStringArray(candidate.improvementAreas);
  const suggestedRoles = asStringArray(candidate.suggestedRoles);

  // Safely parse estimatedExperienceYears -- it could be a string like "5"
  // or a float like 5.7; we normalize it to a safe integer.
  const estimatedExperienceYearsRaw =
    typeof candidate.estimatedExperienceYears === 'number'
      ? candidate.estimatedExperienceYears
      : Number(candidate.estimatedExperienceYears ?? 0);

  // Clamp experience to [0, 50] and round to nearest integer.
  // Number.isFinite() rejects NaN and Infinity values.
  const estimatedExperienceYears = Number.isFinite(estimatedExperienceYearsRaw)
    ? Math.max(0, Math.min(50, Math.round(estimatedExperienceYearsRaw)))
    : 0; // If parsing failed, treat as 0 years experience

  // Apply the weighted scoring formula (see JSDoc above for breakdown)
  const computed =
    55 +                                                     // Base score
    Math.min(skills.length, 12) * 2 +                       // Skills: max 12*2 = 24 pts
    Math.min(strengths.length, 8) * 2 +                     // Strengths: max 8*2 = 16 pts
    Math.min(suggestedRoles.length, 5) +                    // Roles: max 5*1 = 5 pts
    Math.min(Math.floor(estimatedExperienceYears / 2), 8) - // Experience: max 8 pts
    Math.min(improvementAreas.length, 8) * 2;               // Penalty: max 8*2 = 16 pts

  // Clamp the final result to the range [35, 95]
  return Math.max(35, Math.min(95, Math.round(computed)));
}

/**
 * sanitizeInsights
 * ----------------
 * Converts raw (potentially malformed) JSON from the AI model
 * into a guaranteed-safe `ResumeInsights` object.
 *
 * WHY IS THIS NEEDED?
 * AI models do not always follow instructions perfectly. Even when
 * told "return JSON with these exact fields", a model might:
 *   - Return a number as a string (e.g. atsScore: "78" instead of 78)
 *   - Omit a field entirely
 *   - Return null or undefined for a field
 *   - Return a non-array where an array is expected
 *
 * This function acts as a "firewall" -- nothing broken gets through.
 * Every field is checked and either used (if valid) or replaced
 * with a safe default value.
 *
 * @param raw - The raw parsed JSON object from the AI (type `unknown`
 *              because we do not know yet if it is valid).
 * @returns   - A fully valid `ResumeInsights` object, always.
 */
function sanitizeInsights(raw: unknown): ResumeInsights {
  // Cast to a flexible Record type so we can safely access any field.
  // (raw || {}) ensures we handle null/undefined gracefully.
  const candidate = (raw || {}) as Record<string, unknown>;

  // Parse atsScore -- it might be a number OR a numeric string like "75"
  const atsScoreRaw =
    typeof candidate.atsScore === 'number' ? candidate.atsScore : Number(candidate.atsScore ?? 0);

  // Only trust the AI's atsScore if it is a valid finite positive number
  const hasValidAtsScore = Number.isFinite(atsScoreRaw) && atsScoreRaw > 0;

  return {
    // summary: use AI value if it is a non-empty string, else use a placeholder
    summary:
      typeof candidate.summary === 'string' && candidate.summary.trim().length > 0
        ? candidate.summary.trim()
        : 'No summary generated.',

    // Array fields: each goes through asStringArray() for deep sanitization
    skills: asStringArray(candidate.skills),
    strengths: asStringArray(candidate.strengths),
    improvementAreas: asStringArray(candidate.improvementAreas),
    suggestedRoles: asStringArray(candidate.suggestedRoles),
    interviewFocus: asStringArray(candidate.interviewFocus),

    // estimatedExperienceYears: clamp to [0, 50], default to 0 if invalid
    estimatedExperienceYears:
      typeof candidate.estimatedExperienceYears === 'number'
        ? Math.max(0, Math.min(50, Math.round(candidate.estimatedExperienceYears)))
        : 0,

    // atsScore: use AI value (clamped to [0, 100]) OR compute our own fallback
    atsScore: hasValidAtsScore
      ? Math.max(0, Math.min(100, Math.round(atsScoreRaw))) // AI gave a valid score
      : computeFallbackAtsScore(candidate),                 // AI did not -- compute ourselves
  };
}

/**
 * normalizeResumeInsights (EXPORTED)
 * -----------------------------------
 * Public wrapper around the private `sanitizeInsights` function.
 * Other modules should call THIS when they have raw AI JSON and
 * need a safe, typed `ResumeInsights` object.
 *
 * The indirection (wrapping sanitizeInsights) means the internal
 * sanitization logic can evolve without breaking the public API.
 *
 * @param raw - Raw parsed AI JSON object.
 * @returns   - A fully validated `ResumeInsights` object.
 */
export function normalizeResumeInsights(raw: unknown): ResumeInsights {
  return sanitizeInsights(raw);
}

/**
 * sanitizeQuestions
 * -----------------
 * Converts raw AI JSON into a clean, validated array of
 * `InterviewQuestion` objects.
 *
 * HOW IT WORKS (step by step):
 *  1. Extract the `questions` array from the raw object.
 *     If the field is missing or not an array, default to [].
 *  2. For each item in the array:
 *     a. Skip it if it is null or not an object (unexpected types).
 *     b. Extract `question` text -- must be non-empty, else skip.
 *     c. Extract `skillFocus` -- optional; defaults to 'General communication'.
 *  3. Filter out any items that returned null (failed validation).
 *  4. Cap the result at 15 questions maximum.
 *
 * @param raw - Raw parsed AI JSON (the full response object).
 * @returns   - A valid array of `InterviewQuestion`, at most 15 items.
 */
function sanitizeQuestions(raw: unknown): InterviewQuestion[] {
  const candidate = (raw || {}) as Record<string, unknown>;

  // The AI is expected to return { questions: [...] }.
  // If the field is missing or not an array, we safely default to [].
  const questionsRaw = Array.isArray(candidate.questions) ? candidate.questions : [];

  const questions = questionsRaw
    .map((item) => {
      // Skip null, numbers, strings -- we need an actual object
      if (!item || typeof item !== 'object') {
        return null; // Will be filtered out below
      }

      const entry = item as Record<string, unknown>;

      // Extract question text; trim whitespace; default to '' if not a string
      const question = typeof entry.question === 'string' ? entry.question.trim() : '';

      // Extract skillFocus; default to 'General communication' if missing
      const skillFocus =
        typeof entry.skillFocus === 'string' ? entry.skillFocus.trim() : 'General communication';

      // A question with no text is useless -- discard it
      if (!question) {
        return null;
      }

      return { question, skillFocus };
    })
    // TypeScript type guard: removes null values and narrows type to InterviewQuestion
    .filter((item): item is InterviewQuestion => Boolean(item))
    .slice(0, 15); // Keep at most 15 questions

  return questions;
}

/**
 * ensureIntroQuestionFirst (EXPORTED)
 * ------------------------------------
 * Guarantees that the standard "Tell me about yourself" intro question
 * is always the FIRST question in the list, and that no duplicate
 * intro-style questions from the AI appear.
 *
 * WHY IS THIS NEEDED?
 * When the AI generates questions, it sometimes creates its own version
 * of "Tell me about yourself". We do not want two such questions. We
 * always use our predefined INTRO_INTERVIEW_QUESTION constant.
 *
 * HOW IT WORKS:
 *  1. Filter out any AI-generated question that looks like an intro
 *     (contains "tell me about yourself" or "introduce yourself").
 *  2. Prepend INTRO_INTERVIEW_QUESTION at position 0.
 *  3. If `questionCount` is given, slice the result to that length.
 *
 * @param questions     - The raw list of AI-generated questions.
 * @param questionCount - (Optional) Maximum number of questions to return.
 * @returns             - Reordered list with the intro question always first.
 *
 * Example:
 *   Input:  ["Tell me about yourself", "Explain REST APIs", "Describe a challenge"]
 *   Output: [INTRO_QUESTION, "Explain REST APIs", "Describe a challenge"]
 *   (The AI's intro is replaced by our standardized constant version)
 */
export function ensureIntroQuestionFirst(
  questions: InterviewQuestion[],
  questionCount?: number,
): InterviewQuestion[] {
  // Remove any question that looks like an intro (case-insensitive check)
  const nonIntroQuestions = questions.filter((item) => {
    const normalized = item.question.trim().toLowerCase();
    return !(
      normalized.includes('tell me about yourself') ||
      normalized.includes('introduce yourself')
    );
  });

  // Prepend our standardized intro question at position 0
  const ordered = [INTRO_INTERVIEW_QUESTION, ...nonIntroQuestions];

  // If a specific count was requested, slice to that length.
  // Math.max(1, ...) ensures we always return at least 1 question.
  if (typeof questionCount === 'number' && Number.isFinite(questionCount)) {
    return ordered.slice(0, Math.max(1, Math.round(questionCount)));
  }

  // No count limit -- return the full ordered list
  return ordered;
}

/**
 * sanitizeAnswerEvaluation
 * ------------------------
 * Converts raw AI JSON into a guaranteed-safe `AnswerEvaluation` object.
 *
 * Similar to `sanitizeInsights`, this guards against:
 *  - Missing or non-numeric score
 *  - Missing or empty feedback text
 *  - Missing follow-up question
 *
 * Each field either uses the AI value (if valid) or falls back to a
 * safe, meaningful default so the UI never crashes or shows garbage.
 *
 * @param raw - Raw parsed AI JSON from the evaluation response.
 * @returns   - A fully valid `AnswerEvaluation` object.
 */
function sanitizeAnswerEvaluation(raw: unknown): AnswerEvaluation {
  const candidate = (raw || {}) as Record<string, unknown>;

  // Parse score -- handle both number type and numeric string type
  const scoreRaw =
    typeof candidate.score === 'number' ? candidate.score : Number(candidate.score ?? 0);

  // If followUpQuestion is missing or empty, provide a generic fallback
  const followUpQuestion =
    typeof candidate.followUpQuestion === 'string' && candidate.followUpQuestion.trim().length > 0
      ? candidate.followUpQuestion.trim()
      : 'Can you give a specific example from your past work for that answer?'; // Safe default

  return {
    // score: clamp to [0, 100], default to 0 if NaN or Infinity
    score: Number.isFinite(scoreRaw) ? Math.max(0, Math.min(100, Math.round(scoreRaw))) : 0,

    // Array fields: sanitized through asStringArray()
    strengths: asStringArray(candidate.strengths),
    improvementAreas: asStringArray(candidate.improvementAreas),

    // feedbackSummary: use AI text if valid, else fallback placeholder
    feedbackSummary:
      typeof candidate.feedbackSummary === 'string' && candidate.feedbackSummary.trim().length > 0
        ? candidate.feedbackSummary.trim()
        : 'No feedback summary generated.',

    followUpQuestion,
  };
}

// -----------------------------------------------------------------
// SECTION 3: MAIN AI FUNCTIONS (EXPORTED, ASYNC)
// These are the public-facing async functions that make real HTTP
// calls to the GROQ API and return structured, validated results.
//
// Each function follows the same 6-step pattern:
//   1. Read and validate the API key from environment variables.
//   2. Create a Groq client instance using the API key.
//   3. Build a prompt (system message + user message).
//   4. Call the GROQ API and await the response.
//   5. Parse the raw JSON string from the API response.
//   6. Sanitize and return the typed, validated result object.
// -----------------------------------------------------------------

/**
 * analyzeResumeWithGroq (EXPORTED, ASYNC)
 * ----------------------------------------
 * Sends the candidate's resume text to the GROQ AI and returns
 * a fully structured `ResumeInsights` object.
 *
 * This is typically the FIRST call in the interview workflow:
 *   resume text -> analyzeResumeWithGroq -> ResumeInsights
 *   ResumeInsights -> generateInterviewQuestionsWithGroq -> questions
 *
 * PROMPT STRATEGY:
 *  - System message: Sets the AI's role as "expert resume analyzer"
 *    and specifies the EXACT JSON schema it must return.
 *  - User message: The actual resume text to analyze.
 *  - temperature: 0.2 (low) -- more deterministic/consistent output.
 *    Lower temperature = less creativity, more structured response.
 *  - response_format: { type: 'json_object' } -- forces JSON-only output,
 *    preventing the model from wrapping content in markdown code blocks.
 *
 * @param resumeText - The full text content of the candidate's resume.
 * @returns          - A validated `ResumeInsights` object.
 * @throws           - Error if GROQ_API_KEY is missing or API call fails.
 */
export async function analyzeResumeWithGroq(resumeText: string): Promise<ResumeInsights> {
  // Step 1: Check for the API key -- fail fast with a clear error message
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY in environment variables.');
  }

  // Step 2: Instantiate the GROQ client with the validated API key
  const groq = new Groq({ apiKey });

  // Steps 3 & 4: Build the two-message prompt and make the API call
  const completion = await groq.chat.completions.create({
    // Use the model from env vars, or fall back to LLaMA 3.3 70B
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',

    // Low temperature = consistent, structured output (less "creative")
    temperature: 0.2,

    // Force the model to return a raw JSON object (no prose, no markdown)
    response_format: { type: 'json_object' },

    messages: [
      {
        role: 'system',
        // This message tells the AI WHO IT IS and WHAT FORMAT to return.
        // It acts as both a persona setup and an output schema definition.
        content:
          'You are an expert resume analyzer for interview preparation. Return only valid JSON with fields: summary (string), skills (string[]), strengths (string[]), improvementAreas (string[]), suggestedRoles (string[]), interviewFocus (string[]), estimatedExperienceYears (number), atsScore (number 0-100). Keep arrays concise and practical.',
      },
      {
        role: 'user',
        // This is the actual task: send the resume text for analysis.
        content: `Analyze this resume text and generate interview coaching insights:\n\n${resumeText}`,
      },
    ],
  });

  // Step 5: Extract the raw text from the first model output choice.
  // The || '{}' fallback prevents JSON.parse from throwing on undefined.
  const rawContent = completion.choices[0]?.message?.content || '{}';

  // Parse the JSON string into a JavaScript object
  const parsed = JSON.parse(rawContent);

  // Step 6: Sanitize and return -- guarantees a valid ResumeInsights shape
  return sanitizeInsights(parsed);
}

/**
 * generateInterviewQuestionsWithGroq (EXPORTED, ASYNC)
 * ------------------------------------------------------
 * Generates a customized list of interview questions based on:
 *  - The candidate's resume insights (from analyzeResumeWithGroq).
 *  - An optional job description (to align questions with the role).
 *  - A difficulty level (easy / medium / hard).
 *  - A desired number of questions.
 *
 * IMPORTANT NOTE ABOUT QUESTION COUNT:
 * We always prepend INTRO_INTERVIEW_QUESTION ourselves (via
 * `ensureIntroQuestionFirst`). So we ask the AI for (questionCount - 1)
 * questions, then add the intro ourselves. This ensures:
 *  - The intro question is always our consistent, predefined version.
 *  - The final list has exactly `questionCount` questions total.
 *
 * PROMPT STRATEGY:
 *  - temperature: 0.4 (slightly higher than resume analysis) -- allows
 *    some creativity in question phrasing while remaining focused.
 *  - Difficulty guidance in the prompt shapes the AI's question style
 *    (foundational vs. architectural vs. trade-off-heavy).
 *  - Job description: if provided, the AI aligns questions to that role;
 *    otherwise it uses resume context only.
 *
 * FALLBACK: If the AI returns zero valid questions (completely broken
 * response), we return two hardcoded fallback questions so the interview
 * session can still proceed without crashing.
 *
 * @param insights        - Resume insights from analyzeResumeWithGroq.
 * @param questionCount   - Total number of questions to return (default: 6).
 * @param difficulty      - Difficulty level (default: 'medium').
 * @param jobDescription  - (Optional) Job description to tailor questions.
 * @returns               - Validated list of InterviewQuestion, intro first.
 * @throws                - Error if GROQ_API_KEY is missing or API call fails.
 */
export async function generateInterviewQuestionsWithGroq(
  insights: ResumeInsights,
  questionCount = 6,
  difficulty: InterviewDifficulty = 'medium',
  jobDescription?: string,
): Promise<InterviewQuestion[]> {
  // Step 1: Validate the API key
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY in environment variables.');
  }

  const groq = new Groq({ apiKey });

  // Normalize the job description: if not a string, treat as empty
  const normalizedJobDescription = typeof jobDescription === 'string' ? jobDescription.trim() : '';

  // Request one fewer question since we are adding the intro ourselves.
  // Math.max(1, ...) ensures we always request at least 1 question from the AI.
  const remainingQuestionCount = Math.max(1, questionCount - 1);

  // Steps 3 & 4: Build the prompt and call the API
  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',

    // Slightly higher temperature -- allows more varied question phrasing
    temperature: 0.4,

    response_format: { type: 'json_object' },

    messages: [
      {
        role: 'system',
        // Instructs the AI to return questions in a specific JSON structure:
        // { "questions": [{ "question": "...", "skillFocus": "..." }] }
        // Also defines the ordering strategy (behavioral before technical).
        content:
          'You are an interview coach. Return only valid JSON: {"questions":[{"question":"...","skillFocus":"..."}]}. If a job description is provided, align most questions to that role while grounding them in the candidate resume. If no job description is provided, use only resume strengths and gaps. Start with general/behavioral questions before jumping to technical ones.',
      },
      {
        role: 'user',
        // The user message provides:
        //  - How many questions to generate (one less than total; intro added by us)
        //  - The full resume insights as a JSON string (full context for the AI)
        //  - The job description context (or a note saying it is not provided)
        //  - The difficulty level and its specific question-style guidance
        content: `Create ${remainingQuestionCount} interview questions using this resume insight JSON:\n${JSON.stringify(insights)}\n\nJob description context (${normalizedJobDescription ? 'provided' : 'not provided'}):\n${normalizedJobDescription || 'No job description provided. Use resume context only.'}\n\nDifficulty level: ${difficulty}.\nRules: Start with general/behavioral questions then move to technical. Include mix of behavioral + technical + project-based questions. Keep each concise. When a job description is provided, prioritize required responsibilities and skills from it.\nDifficulty guidance:\n- easy: beginner-friendly, foundational concepts, direct phrasing, low complexity follow-ups.\n- medium: practical real-world scenarios, moderate depth, some trade-off discussion.\n- hard: senior-level depth, architecture/trade-offs, edge cases, performance and scaling considerations.`,
      },
    ],
  });

  // Step 5: Parse the raw response text into a JavaScript object
  const rawContent = completion.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(rawContent);

  // Step 6: Sanitize the questions array extracted from the parsed object
  const questions = sanitizeQuestions(parsed);

  // FALLBACK: If the AI returned nothing useful, provide a minimal hardcoded
  // set so the interview session is not completely broken.
  if (questions.length === 0) {
    return [
      INTRO_INTERVIEW_QUESTION,
      {
        question: 'Tell me about a project where you solved a difficult technical problem.',
        skillFocus: 'Project storytelling',
      },
    ];
  }

  // Reorder so intro is always first, then apply the question count limit
  return ensureIntroQuestionFirst(questions, questionCount);
}

/**
 * evaluateAnswerWithGroq (EXPORTED, ASYNC)
 * -----------------------------------------
 * Evaluates a candidate's answer to an interview question using AI,
 * returning structured feedback including a score, strengths,
 * improvement areas, a feedback summary, and a follow-up question.
 *
 * This function is called after EACH answer the candidate gives
 * during a live interview session.
 *
 * WHAT THE AI RECEIVES:
 *  - The interview question that was asked.
 *  - The candidate's text answer.
 *  - The full resume insights (so the AI can evaluate the answer
 *    in context -- e.g., checking if the answer aligns with stated skills).
 *
 * WHAT THE AI RETURNS (after sanitization):
 *  - score (0-100)           : Numeric score for the answer.
 *  - strengths (string[])    : What the candidate did well.
 *  - improvementAreas (string[]) : What could be improved.
 *  - feedbackSummary (string): A concise narrative evaluation.
 *  - followUpQuestion (string): The next question to keep the
 *    interview conversation going naturally.
 *
 * temperature: 0.3 (low-medium) -- feedback should be consistent and
 * fair, not overly creative or random between sessions.
 *
 * @param input - An object containing:
 *   - currentQuestion  : The question that was asked.
 *   - userAnswer       : The candidate's text answer.
 *   - resumeInsights   : The full resume analysis for context.
 * @returns     - A validated `AnswerEvaluation` object.
 * @throws      - Error if GROQ_API_KEY is missing or API call fails.
 */
export async function evaluateAnswerWithGroq(input: {
  currentQuestion: string;
  userAnswer: string;
  resumeInsights: ResumeInsights;
}): Promise<AnswerEvaluation> {
  // Step 1: Validate the API key
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY in environment variables.');
  }

  // Step 2: Instantiate the GROQ client
  const groq = new Groq({ apiKey });

  // Steps 3 & 4: Build the evaluation prompt and call the API
  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',

    // 0.3 temperature: balanced -- not too creative, not too rigid
    temperature: 0.3,

    response_format: { type: 'json_object' },

    messages: [
      {
        role: 'system',
        // Sets up the AI as an "interview evaluator" persona and specifies
        // the exact JSON schema for all response fields.
        content:
          'You are an interview evaluator. Return only JSON with fields: score (0-100), strengths (string[]), improvementAreas (string[]), feedbackSummary (string), followUpQuestion (string). Keep feedback concise and practical.',
      },
      {
        role: 'user',
        // Provides the question, the answer, and the resume context all in
        // one message so the AI can evaluate them holistically together.
        content: `Evaluate the candidate answer for interview coaching.\nQuestion: ${input.currentQuestion}\nAnswer: ${input.userAnswer}\nResumeInsights: ${JSON.stringify(input.resumeInsights)}`,
      },
    ],
  });

  // Step 5: Parse the raw response text into a JavaScript object
  const rawContent = completion.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(rawContent);

  // Step 6: Sanitize and return a guaranteed-valid AnswerEvaluation
  return sanitizeAnswerEvaluation(parsed);
}
