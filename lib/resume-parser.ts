/**
 * ============================================================
 * FILE: resume-parser.ts
 * PURPOSE: Extract plain text from uploaded resume files
 * ============================================================
 *
 * This module accepts a browser `File` object and extracts clean
 * plain text from it, regardless of the file format.
 *
 * Supported formats:
 *  - PDF  (.pdf)  : Parsed using the `pdf-parse` npm package
 *                   (dynamically imported to avoid loading it
 *                    unless a PDF is actually uploaded).
 *  - DOCX (.docx) : Parsed using the `mammoth` package which
 *                   extracts raw text from Word documents.
 *  - TXT  (.txt)  : Read directly as UTF-8 text.
 *
 * After extraction, all text is passed through `normalizeText()`
 * which collapses multiple whitespace characters into a single
 * space — producing compact, consistent input for the AI model.
 *
 * The extracted text is then sent to `analyzeResumeWithGroq()`
 * in the resume upload API route.
 *
 * CONSTRAINTS:
 *  - MAX file size: 5 MB (enforced by MAX_RESUME_SIZE_BYTES)
 *  - MIN text length: 80 characters (enforced in the API route)
 * ============================================================
 */

import mammoth from 'mammoth';

/**
 * MAX_RESUME_SIZE_BYTES
 * ---------------------
 * Hard limit on the size of the uploaded resume file.
 * Files larger than 5 MB are rejected before any parsing
 * attempt. This protects against slow processing and potential
 * memory issues with very large PDF/DOCX files.
 */
// Maximum upload size to avoid expensive parsing on very large files.
export const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * ParsedResume
 * ------------
 * The result returned by `extractResumeText()`.
 *
 * Fields:
 *  - text         : Normalized plain text extracted from the file.
 *  - detectedType : The format that was detected/parsed
 *                   ('pdf' | 'docx' | 'txt').
 */
type ParsedResume = {
  text: string;
  detectedType: 'pdf' | 'docx' | 'txt';
};

/**
 * normalizeText
 * -------------
 * Collapses all consecutive whitespace characters (spaces, tabs,
 * newlines) into a single space, then trims the result.
 *
 * WHY IS THIS NEEDED?
 * PDF and DOCX parsers often insert extra whitespace between
 * words, line breaks, or formatting characters. The AI model
 * processes cleaner, denser text more reliably.
 *
 * @param text - Raw extracted text string.
 * @returns    - A single-line, compact, trimmed version of the text.
 */
// Normalize whitespace and trim to produce compact text for the analyzer.
function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * extractTextFromPdf
 * ------------------
 * Extracts plain text from a PDF file buffer using `pdf-parse`.
 *
 * WHY DYNAMIC IMPORT?
 * `pdf-parse` is a relatively large dependency that is only
 * needed when the user uploads a PDF. By using
 * `await import('pdf-parse')` instead of a static import at the
 * top of the file, we avoid loading it into memory for DOCX or
 * TXT uploads. This improves startup time.
 *
 * @param buffer - A Node.js Buffer containing the raw PDF bytes.
 * @returns      - The extracted text string, or empty string if blank.
 * @throws       - A descriptive Error if pdf-parse fails.
 */
// PDF text extraction uses the `pdf-parse` package which is dynamically
// imported so the dependency is only required when a PDF is uploaded.
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const parsed = await pdfParse(buffer);
    return parsed.text || '';
  } catch (error) {
    throw new Error(
      `Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * extractResumeText (EXPORTED, ASYNC)
 * ------------------------------------
 * The main public function of this module. Accepts a browser File
 * object and extracts clean plain text regardless of format.
 *
 * HOW IT WORKS:
 *  1. Enforce the 5 MB size limit — reject immediately if exceeded.
 *  2. Convert the File to a Node.js Buffer (needed by pdf-parse
 *     and mammoth which work with binary data).
 *  3. Detect the file format using MIME type and file extension.
 *  4. Dispatch to the appropriate parser:
 *     - PDF  → extractTextFromPdf(buffer)
 *     - DOCX → mammoth.extractRawText({ buffer })
 *     - TXT  → buffer.toString('utf8')
 *  5. Normalize the text and return with the detected type.
 *
 * FORMAT DETECTION ORDER:
 * MIME type is checked first, then file extension as a fallback.
 * This handles cases where the browser sends the wrong MIME type.
 *
 * @param file - A browser File object from a <input type="file"> upload.
 * @returns    - A ParsedResume with extracted text and format.
 * @throws     - Error if file is too large, unreadable, or unsupported format.
 */
// Public helper: accept a `File` (browser File API) and extract plain text
// regardless of whether the input is PDF, DOCX or plain text. DOCX parsing
// uses `mammoth` which generally produces good raw text; PDFs are handled
// by `pdf-parse` and plain `.txt` files are read directly.
export async function extractResumeText(file: File): Promise<ParsedResume> {
  // Step 1: Enforce file size limit
  if (file.size > MAX_RESUME_SIZE_BYTES) {
    throw new Error('Resume must be 5 MB or smaller.');
  }

  // Step 2: Convert File to a Node.js Buffer for binary parsing libraries
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = file.name.toLowerCase();

  // Step 3 & 4: Detect format and parse accordingly

  // PDF: Check MIME type OR .pdf extension
  if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
    const pdfText = await extractTextFromPdf(buffer);
    return {
      text: normalizeText(pdfText),
      detectedType: 'pdf',
    };
  }

  // DOCX: Check MIME type OR .docx extension
  // mammoth.extractRawText() pulls plain text, ignoring formatting/styles
  if (
    file.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.endsWith('.docx')
  ) {
    const parsed = await mammoth.extractRawText({ buffer });
    return {
      text: normalizeText(parsed.value || ''),
      detectedType: 'docx',
    };
  }

  // TXT: Check MIME type OR .txt extension
  // buffer.toString('utf8') reads the raw bytes as UTF-8 text
  if (file.type === 'text/plain' || fileName.endsWith('.txt')) {
    return {
      text: normalizeText(buffer.toString('utf8')),
      detectedType: 'txt',
    };
  }

  // If none of the above formats matched, reject the file
  throw new Error('Unsupported resume format. Please upload PDF, DOCX, or TXT.');
}
