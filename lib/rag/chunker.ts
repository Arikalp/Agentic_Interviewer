import type { ResumeChunk } from '@/models/ResumeChunk';

/**
 * Chunk type returned by the chunker (without embedding or DB fields).
 */
export type RawResumeChunk = Omit<ResumeChunk, '_id' | 'embedding' | 'updatedAt' | 'userId'>;

// ---------------------------------------------------------------------------
// Section detection
// ---------------------------------------------------------------------------

/**
 * Preferred section ordering: most informative sections come first so that
 * top-k retrieval tends to surface the strongest resume signals.
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
 * Regex patterns that typically mark the start of a resume section header.
 * A header is a short line (< 60 chars) that is either all-uppercase or
 * matches one of the known section keywords.
 */
const SECTION_HEADER_REGEX =
  /^(?:[A-Z][A-Z\s\/&]+|(?:projects?|experience|skills?|education|certifications?|achievements?|awards?|publications?|summary|objective|profile|work\s+experience|professional\s+experience|technical\s+skills?|languages?|interests?|hobbies|references?))[\s:–-]*$/i;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalize a section label to lowercase for ordering lookups. */
function normalizeSection(label: string): string {
  return label.trim().toLowerCase().replace(/[:\-–]+$/, '').trim();
}

/** Compare two sections by their preferred order index. Lower is better. */
function sectionPriority(label: string): number {
  const key = normalizeSection(label);
  const idx = SECTION_ORDER.indexOf(key);
  return idx === -1 ? SECTION_ORDER.length : idx;
}

/**
 * Split a block of text into overlapping sentence-level chunks.
 * Each chunk is ~300 characters with ~50-character overlap to preserve context.
 */
function sentenceChunk(text: string, maxLen = 300, overlap = 50): string[] {
  // Split on sentence boundaries
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + ' ' + sentence).length > maxLen && current.length > 0) {
      chunks.push(current.trim());
      // Keep overlap: last part of current chunk
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

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Splits raw resume text into semantic chunks organized by section.
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
  const lines = resumeText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // ── Section-aware parsing ──────────────────────────────────────────────
  type SectionAccum = { section: string; lines: string[] };
  const sections: SectionAccum[] = [];
  let currentSection: SectionAccum = { section: 'General', lines: [] };

  for (const line of lines) {
    if (SECTION_HEADER_REGEX.test(line) && line.length < 60) {
      if (currentSection.lines.length > 0) {
        sections.push(currentSection);
      }
      currentSection = { section: line.replace(/[:\-–]+$/, '').trim(), lines: [] };
    } else {
      currentSection.lines.push(line);
    }
  }
  if (currentSection.lines.length > 0) {
    sections.push(currentSection);
  }

  // If no sections were found at all, treat entire text as one section
  if (sections.length === 0 || (sections.length === 1 && sections[0].section === 'General')) {
    const chunks = sentenceChunk(resumeText);
    return chunks.map((text, chunkIndex) => ({
      section: 'General',
      text,
      chunkIndex,
    }));
  }

  // ── Convert sections → chunks ──────────────────────────────────────────
  const allChunks: RawResumeChunk[] = [];

  // Sort by preferred priority before assigning global indices
  sections.sort((a, b) => sectionPriority(a.section) - sectionPriority(b.section));

  let globalIndex = 0;
  for (const sec of sections) {
    const sectionText = sec.lines.join(' ').trim();
    if (!sectionText) continue;

    // Sentence-chunk each section to keep individual vectors focused
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
