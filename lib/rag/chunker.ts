/**
 * ============================================================
 * FILE: lib/rag/chunker.ts
 * PURPOSE: Split resume text into semantic, section-aware chunks
 * ============================================================
 *
 * WHY CHUNK THE RESUME?
 * Embedding the entire resume as a single vector means the search
 * can only retrieve the whole resume — it loses section-level
 * precision. By splitting into chunks:
 *  - "Projects" chunks match questions about specific projects.
 *  - "Skills" chunks match questions about technologies.
 *  - "Experience" chunks match questions about past jobs.
 *
 * CHUNKING STRATEGY (4 steps):
 *  1. SECTION DETECTION: Lines are scanned for known section
 *     headers (e.g., "EXPERIENCE", "Skills:", "Projects –").
 *  2. SECTION GROUPING: All lines following a header are grouped
 *     under that section until the next header.
 *  3. SENTENCE CHUNKING: Each section is further split into
 *     overlapping ~300-character chunks with ~50-char overlap
 *     to preserve context across chunk boundaries.
 *  4. PRIORITY SORTING: Sections are reordered by relevance
 *     (Projects > Experience > Skills > Education > ...) so
 *     that top-k retrieval surfaces the strongest signals first.
 *
 * FALLBACK:
 * If no section headers are found, the entire text is treated as
 * one section and sentence-chunked directly.
 * ============================================================
 */

import type { ResumeChunk } from '@/models/ResumeChunk';

/**
 * Chunk type returned by the chunker (without embedding or DB fields).
 */
export type RawResumeChunk = Omit<ResumeChunk, '_id' | 'embedding' | 'updatedAt' | 'userId'>;

// ---------------------------------------------------------------------------
// Section detection
// ---------------------------------------------------------------------------

/**
 * SECTION_ORDER
 * -------------
 * Preferred section ordering: most informative sections come first
 * so that top-k retrieval tends to surface the strongest resume
 * signals. "Projects" and "Experience" are ranked highest because
 * they contain the most relevant technical content for interviews.
 */
const SECTION_ORDER = [
  'projects',
  'experience',
  'work experience',
  'professional experience',
  'skills',
  'technical skills',
  'education',
  'certifications',
  'achievements',
  'awards',
  'publications',
  'summary',
  'objective',
  'profile',
];

/**
 * SECTION_HEADER_REGEX
 * --------------------
 * Regex patterns that detect section header lines.
 * A line is treated as a header if it:
 *  - Is fewer than 60 characters (headers are always short)
 *  - Is all-uppercase (e.g., "WORK EXPERIENCE")
 *  - OR matches one of the known section keyword patterns
 */
const SECTION_HEADER_REGEX =
  /^(?:[A-Z][A-Z\s\/&]+|(?:projects?|experience|skills?|education|certifications?|achievements?|awards?|publications?|summary|objective|profile|work\s+experience|professional\s+experience|technical\s+skills?|languages?|interests?|hobbies|references?))[\s:–-]*$/i;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * normalizeSection
 * ----------------
 * Converts a section label to lowercase and strips trailing
 * punctuation (:, -, –) for consistent lookup in SECTION_ORDER.
 */
/** Normalize a section label to lowercase for ordering lookups. */
function normalizeSection(label: string): string {
  return label.trim().toLowerCase().replace(/[:\-–]+$/, '').trim();
}

/**
 * sectionPriority
 * ---------------
 * Returns the sort index for a given section label.
 * Lower index = higher priority = retrieved first in top-k.
 * Sections not in SECTION_ORDER get a high index (low priority).
 */
/** Compare two sections by their preferred order index. Lower is better. */
function sectionPriority(label: string): number {
  const key = normalizeSection(label);
  const idx = SECTION_ORDER.indexOf(key);
  return idx === -1 ? SECTION_ORDER.length : idx;
}

/**
 * sentenceChunk
 * -------------
 * Splits a block of text into overlapping sentence-level chunks.
 *
 * TARGET: Each chunk is ~300 characters.
 * OVERLAP: ~50 characters are carried over from the previous chunk.
 *
 * WHY OVERLAP?
 * Without overlap, a sentence split at a chunk boundary loses
 * context. The overlap ensures the start of each chunk has enough
 * context from the previous chunk to be understood in isolation.
 *
 * HOW IT WORKS:
 *  1. Split text on sentence-ending punctuation (. ! ?).
 *  2. Accumulate sentences into `current` until adding the next
 *     sentence would exceed `maxLen`.
 *  3. Push `current` as a completed chunk.
 *  4. Carry the last ~`overlap` characters forward into the next
 *     chunk by trimming from the tail of `current`.
 */
function sentenceChunk(text: string, maxLen = 300, overlap = 50): string[] {
  // Split on sentence boundaries (after . ! ?)
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + ' ' + sentence).length > maxLen && current.length > 0) {
      chunks.push(current.trim());
      // Keep overlap: take the last few words of the current chunk
      // and carry them into the next chunk for contextual continuity
      const words = current.split(' ');
      const overlapWords: string[] = [];
      let overlapLen = 0;
      for (let i = words.length - 1; i >= 0; i--) {
        overlapLen += words[i].length + 1;
        if (overlapLen > overlap) break;
        overlapWords.unshift(words[i]);
      }
      current = overlapWords.join(' ');
    }
    current = current ? `${current} ${sentence}` : sentence;
  }

  // Push the final remaining text as the last chunk
  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * chunkResumeText (EXPORTED)
 * --------------------------
 * The main public function. Splits raw resume text into semantic
 * chunks organized by section and sorted by relevance priority.
 *
 * Strategy:
 * 1. Detect section headers by pattern matching.
 * 2. Group lines under their detected sections.
 * 3. Further split large sections via sentence-level chunking.
 * 4. Sort chunks by preferred section priority.
 *
 * Falls back to sentence-based chunking when no headers are found.
 */
export function chunkResumeText(resumeText: string): RawResumeChunk[] {
  // Split input into lines, trim, and discard empty lines
  const lines = resumeText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // ── Section-aware parsing ───────────────────────────────────────────────────────
  type SectionAccum = { section: string; lines: string[] };
  const sections: SectionAccum[] = [];
  // Default section when no header is detected before the first content line
  let currentSection: SectionAccum = { section: 'General', lines: [] };

  for (const line of lines) {
    // Line is a header if it matches the regex AND is < 60 chars
    if (SECTION_HEADER_REGEX.test(line) && line.length < 60) {
      // Save the current section if it has any content
      if (currentSection.lines.length > 0) {
        sections.push(currentSection);
      }
      // Start a new section, stripping trailing punctuation from label
      currentSection = { section: line.replace(/[:\-–]+$/, '').trim(), lines: [] };
    } else {
      // Non-header line: accumulate under the current section
      currentSection.lines.push(line);
    }
  }
  // Push the final section
  if (currentSection.lines.length > 0) {
    sections.push(currentSection);
  }

  // FALLBACK: If no named sections were found, treat entire text as one section
  // If no sections were found at all, treat entire text as one section
  if (sections.length === 0 || (sections.length === 1 && sections[0].section === 'General')) {
    const chunks = sentenceChunk(resumeText);
    return chunks.map((text, chunkIndex) => ({
      section: 'General',
      text,
      chunkIndex,
    }));
  }

  // ── Convert sections → chunks ───────────────────────────────────────────────────
  const allChunks: RawResumeChunk[] = [];

  // Sort sections by priority so top-k retrieval gets the most valuable content
  // Sort by preferred priority before assigning global indices
  sections.sort((a, b) => sectionPriority(a.section) - sectionPriority(b.section));

  let globalIndex = 0;
  for (const sec of sections) {
    // Join all lines in this section into one text block
    const sectionText = sec.lines.join(' ').trim();
    if (!sectionText) continue;

    // Sentence-chunk each section to keep individual vectors focused
    // Sentence-chunk each section to keep each vector focused on one idea
    const subChunks = sentenceChunk(sectionText);
    for (const chunkText of subChunks) {
      if (chunkText.length < 20) continue; // skip trivially short chunks
      allChunks.push({
        section: sec.section,
        text: chunkText,
        chunkIndex: globalIndex++,
      });
    }
  }

  return allChunks;
}
