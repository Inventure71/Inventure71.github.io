import { describe, expect, test } from 'vitest';
import { statSync, readFileSync } from 'node:fs';
import { buildAiGuideToastMarkup } from '../../js/playfolio/ai-guide.js';

const indexHtml = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

describe('AI guide loading budget', () => {
  test('does not ship the hidden toast payload in static HTML', () => {
    expect(indexHtml).not.toContain('data-ai-guide-toast');
    expect(indexHtml).not.toContain('/assets/brand/icons/ClaudeIcon.png');
  });

  test('uses compact web icons when the AI toast is created on demand', () => {
    const markup = buildAiGuideToastMarkup();

    for (const icon of ['ChatGPTIcon.webp', 'ClaudeIcon.webp', 'DeepSeek.webp']) {
      expect(markup).toContain(`/assets/brand/icons/${icon}`);
      const size = statSync(new URL(`../../assets/brand/icons/${icon}`, import.meta.url)).size;
      expect(size).toBeLessThan(30 * 1024);
    }

    expect(markup).not.toContain('/assets/brand/icons/ClaudeIcon.png');
    expect(markup).not.toContain('/assets/brand/icons/DeepSeek.png');
  });
});
