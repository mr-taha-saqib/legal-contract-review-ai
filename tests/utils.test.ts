import { describe, expect, it } from 'vitest';
import {
  capitalize,
  formatFileSize,
  getHighestRisk,
  safeJsonParse,
  truncateText,
} from '@/lib/utils';

describe('utils', () => {
  it('formats file sizes', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
    expect(formatFileSize(512)).toBe('512 Bytes');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(10 * 1024 * 1024)).toBe('10 MB');
  });

  it('truncates long text with an ellipsis and leaves short text alone', () => {
    expect(truncateText('short', 10)).toBe('short');
    expect(truncateText('a very long clause title', 10)).toBe('a very ...');
    expect(truncateText('a very long clause title', 10)).toHaveLength(10);
  });

  it('picks the highest risk level', () => {
    expect(getHighestRisk(['low', 'medium', 'high'])).toBe('high');
    expect(getHighestRisk(['low', 'medium'])).toBe('medium');
    expect(getHighestRisk(['low'])).toBe('low');
    expect(getHighestRisk([])).toBe('low');
  });

  it('parses JSON safely', () => {
    expect(safeJsonParse('["a","b"]', [])).toEqual(['a', 'b']);
    expect(safeJsonParse('{broken', ['fallback'])).toEqual(['fallback']);
  });

  it('capitalizes', () => {
    expect(capitalize('termination')).toBe('Termination');
    expect(capitalize('')).toBe('');
  });
});
