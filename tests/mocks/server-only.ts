// Stub for the 'server-only' package under Vitest: it works via Next.js's
// bundler substituting a no-op for server builds — plain Node/Vitest has no
// such substitution, so the real package throws unconditionally. Tests never
// run in a browser, so the guard has nothing to protect against here.
export {};
