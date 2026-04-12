import mammoth from 'mammoth';
import path from 'path';
import { pathToFileURL } from 'url';

export const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;

type ParsedResume = {
  text: string;
  detectedType: 'pdf' | 'docx' | 'txt';
};

let pdfWorkerConfigured = false;

function configurePdfWorker(PDFParse: { setWorker(workerSrc?: string): string }) {
  if (pdfWorkerConfigured) {
    return;
  }

  const workerPath = path.join(
    process.cwd(),
    'node_modules',
    'pdf-parse',
    'dist',
    'pdf-parse',
    'web',
    'pdf.worker.mjs',
  );

  PDFParse.setWorker(pathToFileURL(workerPath).href);
  pdfWorkerConfigured = true;
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

export async function extractResumeText(file: File): Promise<ParsedResume> {
  if (file.size > MAX_RESUME_SIZE_BYTES) {
    throw new Error('Resume must be 5 MB or smaller.');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = file.name.toLowerCase();

  if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
    const pdfParseModule = await import('pdf-parse');
    const PDFParse = pdfParseModule.PDFParse;

    if (typeof PDFParse !== 'function') {
      throw new Error('PDF parser is not available in the installed pdf-parse package.');
    }

    configurePdfWorker(PDFParse);

    const parser = new PDFParse({ data: buffer });
    let parsedText = '';

    try {
      const parsed = await parser.getText();
      parsedText = parsed.text || '';
    } finally {
      await parser.destroy();
    }

    return {
      text: normalizeText(parsedText),
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
