import { describe, expect, it } from 'vitest';
import { isBot } from '@/lib/shortener/bot-detection';

describe('isBot', () => {
  it('flags known link-preview bots', () => {
    expect(isBot('Slackbot-LinkExpanding 1.0')).toBe(true);
    expect(isBot('facebookexternalhit/1.1')).toBe(true);
    expect(isBot('WhatsApp/2.23.20.0')).toBe(true);
    expect(isBot('TelegramBot (like TwitterBot)')).toBe(true);
    expect(
      isBot(
        'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
      ),
    ).toBe(true);
  });

  it('flags CLI / scripted tools', () => {
    expect(isBot('curl/8.4.0')).toBe(true);
    expect(isBot('Wget/1.21.4')).toBe(true);
    expect(isBot('python-requests/2.31.0')).toBe(true);
  });

  it('flags a missing or empty user-agent', () => {
    expect(isBot(null)).toBe(true);
    expect(isBot('')).toBe(true);
    expect(isBot('   ')).toBe(true);
  });

  it('does not flag ordinary browser user-agents', () => {
    expect(
      isBot(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ),
    ).toBe(false);
    expect(
      isBot(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)',
      ),
    ).toBe(false);
  });
});
