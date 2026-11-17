import { describe, expect, it } from 'vitest';
import { buildAnalysisPrompt, ANALYSIS_SYSTEM_PROMPT } from '@/lib/prompts/analysisPrompt';
import {
  buildChatContext,
  buildChatMessages,
  getSensitiveTopic,
  isSensitiveTopic,
} from '@/lib/prompts/chatPrompt';
import type { ClauseData } from '@/types';

const clause = {
  id: 'c1',
  type: 'liability',
  riskLevel: 'high',
  originalText: 'Developer shall be liable for all damages without limit.',
  plainLanguageExplanation: 'You could owe unlimited money if something goes wrong.',
  riskReasons: ['No liability cap', 'Covers indirect damages'],
} as unknown as ClauseData;

describe('analysis prompt', () => {
  it('wraps the contract in tags after the system instructions', () => {
    const prompt = buildAnalysisPrompt('THE CONTRACT BODY');
    expect(prompt.startsWith(ANALYSIS_SYSTEM_PROMPT)).toBe(true);
    expect(prompt).toContain('<contract>\nTHE CONTRACT BODY\n</contract>');
  });
});

describe('sensitive-topic detection (drives the enhanced legal disclaimer)', () => {
  it.each([
    'Should I sign this contract?',
    'Can they sue me if I miss a deadline?',
    'Am I personally liable for their losses?',
    'Is a $50,000 penalty normal?',
    'Does this affect GDPR compliance?',
  ])('flags: %s', (q) => {
    expect(isSensitiveTopic(q)).toBe(true);
  });

  it.each([
    'What does the confidentiality clause mean?',
    'Summarise the payment terms.',
    'How long does the agreement last?',
  ])('does not flag: %s', (q) => {
    expect(isSensitiveTopic(q)).toBe(false);
  });

  it('names the topic in the disclaimer', () => {
    expect(getSensitiveTopic('Should I sign this?')).toBe('contract execution decisions');
    expect(getSensitiveTopic('Could this end up in court?')).toBe('legal action');
    expect(getSensitiveTopic('What are the damages exposure?')).toBe('financial liability');
    expect(getSensitiveTopic('Is this regulatory compliant?')).toBe('regulatory compliance');
    expect(getSensitiveTopic('Something else')).toBe('this legal matter');
  });
});

describe('chat context', () => {
  it('includes analysis, clause details and the focused clause', () => {
    const ctx = buildChatContext(
      'CONTRACT TEXT',
      { overallRiskLevel: 'high', summary: 'Risky deal.', clauses: [clause] },
      'liability',
    );
    expect(ctx).toContain('<contract>\nCONTRACT TEXT\n</contract>');
    expect(ctx).toContain('Overall Risk Level: HIGH');
    expect(ctx).toContain('### Liability Clause');
    expect(ctx).toContain('- No liability cap');
    expect(ctx).toContain('specifically asking about the liability clause');
  });

  it('works before any analysis exists', () => {
    const ctx = buildChatContext('CONTRACT TEXT', null);
    expect(ctx).toContain('CONTRACT TEXT');
    expect(ctx).not.toContain('Analysis Summary');
  });
});

describe('chat message assembly', () => {
  it('attaches the contract context to the first question of a new chat', () => {
    const msgs = buildChatMessages([], 'CTX', 'What is the term?');
    expect(msgs).toEqual([{ role: 'user', content: 'CTX\n\nMy question: What is the term?' }]);
  });

  it('keeps only the last 20 history messages and re-attaches context', () => {
    const history = Array.from({ length: 25 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `m${i}`,
    }));
    const msgs = buildChatMessages(history, 'CTX', 'new question');

    expect(msgs).toHaveLength(21);
    expect(msgs[0]).toEqual({ role: 'user', content: 'CTX\n\nMy question: m5' });
    expect(msgs[19]).toEqual(history[24]);
    expect(msgs[20]).toEqual({ role: 'user', content: 'new question' });
  });
});
