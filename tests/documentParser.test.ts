import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  detectNonEnglish,
  getFileTypeFromExtension,
  getFileTypeFromMime,
  isVeryLongDocument,
  parseDocument,
  validateFileSize,
} from '@/lib/documentParser';

const fixture = (name: string) => readFileSync(path.join(__dirname, 'fixtures', name));

beforeAll(() => {
  // The parser logs progress on every call; keep test output readable.
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('file type detection', () => {
  it('maps extensions case-insensitively and rejects unsupported ones', () => {
    expect(getFileTypeFromExtension('Lease Agreement.PDF')).toBe('pdf');
    expect(getFileTypeFromExtension('nda.final.docx')).toBe('docx');
    expect(getFileTypeFromExtension('notes.txt')).toBe('txt');
    expect(getFileTypeFromExtension('legacy.doc')).toBeNull();
    expect(getFileTypeFromExtension('no-extension')).toBeNull();
  });

  it('maps MIME types', () => {
    expect(getFileTypeFromMime('application/pdf')).toBe('pdf');
    expect(
      getFileTypeFromMime('application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    ).toBe('docx');
    expect(getFileTypeFromMime('text/plain')).toBe('txt');
    expect(getFileTypeFromMime('image/png')).toBeNull();
  });
});

describe('upload guards', () => {
  it('accepts files up to exactly the size limit', () => {
    const tenMb = 10 * 1024 * 1024;
    expect(validateFileSize(tenMb)).toBe(true);
    expect(validateFileSize(tenMb + 1)).toBe(false);
    expect(validateFileSize(3 * 1024 * 1024, 2)).toBe(false);
  });

  it('flags likely non-English contracts', () => {
    expect(detectNonEnglish(fixture('sample-contract.txt').toString('utf-8'))).toBe(false);
    expect(
      detectNonEnglish('El arrendatario pagará la renta mensual dentro de los primeros cinco días.'),
    ).toBe(true);
  });

  it('flags documents longer than roughly 100 pages', () => {
    expect(isVeryLongDocument('a'.repeat(300_000))).toBe(false);
    expect(isVeryLongDocument('a'.repeat(300_001))).toBe(true);
  });
});

describe('parseDocument', () => {
  it('extracts text and page count from a PDF', async () => {
    // Exported from LibreOffice, like most real uploads.
    const result = await parseDocument(fixture('sample-contract.pdf'), 'pdf');
    expect(result.text).toContain('SOFTWARE DEVELOPMENT SERVICES AGREEMENT');
    expect(result.text).toContain('CONFIDENTIALITY');
    expect(result.pageCount).toBe(2);
  });

  it('gives a friendly error for a corrupt PDF', async () => {
    await expect(parseDocument(Buffer.from('not a pdf at all'), 'pdf')).rejects.toThrow(
      /PDF/,
    );
  });

  it('extracts text from a DOCX', async () => {
    const result = await parseDocument(fixture('sample-nda.docx'), 'docx');
    expect(result.text).toContain('MUTUAL NON-DISCLOSURE AGREEMENT');
    expect(result.text).toContain('Confidential Information');
  });

  it('extracts text from a UTF-8 TXT file', async () => {
    const result = await parseDocument(fixture('sample-contract.txt'), 'txt');
    expect(result.text).toContain('SOFTWARE DEVELOPMENT SERVICES AGREEMENT');
  });

  it('falls back to latin1 for non-UTF-8 text', async () => {
    const latin1 = Buffer.from('Café agreement between the parties', 'latin1');
    const result = await parseDocument(latin1, 'txt');
    expect(result.text).toBe('Café agreement between the parties');
  });

  it('rejects an empty text file', async () => {
    await expect(parseDocument(Buffer.from('   \n  '), 'txt')).rejects.toThrow(
      /Unable to read text file/,
    );
  });
});
