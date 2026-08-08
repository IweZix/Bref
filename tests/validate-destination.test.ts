import { describe, expect, it } from 'vitest';
import { validateDestinationUrl } from '@/lib/shortener/validate-destination';

// Spec test 4: destination validation rejects javascript:, data:, and internal loops.
describe('validateDestinationUrl', () => {
  it('accepts a normal https URL', () => {
    expect(validateDestinationUrl('https://example.com/path').valid).toBe(true);
  });

  it('accepts a normal http URL', () => {
    expect(validateDestinationUrl('http://example.com/path').valid).toBe(true);
  });

  it('rejects javascript: URLs', () => {
    expect(validateDestinationUrl('javascript:alert(1)').valid).toBe(false);
  });

  it('rejects data: URLs', () => {
    expect(
      validateDestinationUrl('data:text/html,<script>alert(1)</script>').valid,
    ).toBe(false);
  });

  it('rejects file: URLs', () => {
    expect(validateDestinationUrl('file:///etc/passwd').valid).toBe(false);
  });

  it('rejects URLs pointing back at the service itself (redirect loop)', () => {
    expect(
      validateDestinationUrl('https://bref.app/foo', 'bref.app').valid,
    ).toBe(false);
  });

  it('allows a different host even if similarly named', () => {
    expect(
      validateDestinationUrl('https://not-bref.app/foo', 'bref.app').valid,
    ).toBe(true);
  });

  it('rejects URLs exceeding the max length', () => {
    const longUrl = `https://example.com/${'a'.repeat(3000)}`;
    expect(validateDestinationUrl(longUrl).valid).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(validateDestinationUrl('').valid).toBe(false);
  });

  it('rejects malformed URLs', () => {
    expect(validateDestinationUrl('not a url').valid).toBe(false);
  });
});
