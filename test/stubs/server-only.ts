// Stand-in for the "server-only" module during tests.
//
// In the app, Next.js provides "server-only": importing it from a browser-side component
// is a build error, which keeps API code (and the API key) on the server. Vitest runs
// plain Node with no browser side, so here the import only needs to resolve to nothing.
export {};
