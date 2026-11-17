/**
 * Wrapper for pdf-parse to suppress initialization errors.
 *
 * Imports pdf-parse/lib/pdf-parse.js rather than the package entry: the entry
 * file runs a debug routine when bundled (module.parent is undefined) that
 * tries to read ./test/data/05-versions-space.pdf and crashes next build.
 */

// Suppress console.error during pdf-parse initialization
type PdfParse = (buffer: Buffer) => Promise<{
  numpages: number;
  numrender: number;
  info: Record<string, unknown>;
  metadata: Record<string, unknown>;
  text: string;
}>;

const originalError = console.error;
let pdfParse: PdfParse;

try {
  // Temporarily suppress errors
  console.error = () => {};

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  pdfParse = require('pdf-parse/lib/pdf-parse.js');
} catch {
  // If require fails completely, try again with error reporting
  console.error = originalError;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  pdfParse = require('pdf-parse/lib/pdf-parse.js');
} finally {
  // Restore console.error
  console.error = originalError;
}

export default pdfParse;
