import mammoth from 'mammoth';

export const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;

type ParsedResume = {
  text: string;
  detectedType: 'pdf' | 'docx' | 'txt';
};

function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

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
