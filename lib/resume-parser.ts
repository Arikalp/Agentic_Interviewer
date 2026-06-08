import mammoth from 'mammoth';

// Maximum upload size to avoid expensive parsing on very large files.
export const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;

type ParsedResume = {
  text: string;
  detectedType: 'pdf' | 'docx' | 'txt';
};

// Normalize whitespace and trim to produce compact text for the analyzer.
function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

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

// Public helper: accept a `File` (browser File API) and extract plain text
// regardless of whether the input is PDF, DOCX or plain text. DOCX parsing
// uses `mammoth` which generally produces good raw text; PDFs are handled
// by `pdf-parse` and plain `.txt` files are read directly.
export async function extractResumeText(file: File): Promise<ParsedResume> {
  if (file.size > MAX_RESUME_SIZE_BYTES) {
    throw new Error('Resume must be 5 MB or smaller.');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = file.name.toLowerCase();

  if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
    const pdfText = await extractTextFromPdf(buffer);
    return {
      text: normalizeText(pdfText),
      detectedType: 'pdf',
    };
  }

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

  if (file.type === 'text/plain' || fileName.endsWith('.txt')) {
    return {
      text: normalizeText(buffer.toString('utf8')),
      detectedType: 'txt',
    };
  }

  throw new Error('Unsupported resume format. Please upload PDF, DOCX, or TXT.');
}
