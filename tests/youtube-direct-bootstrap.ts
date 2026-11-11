// Must evaluate before youtube-direct-api.ts captures its configuration.
process.env.PUBLIC_YOUTUBE_API_ORIGIN = "https://provider.fixture.invalid";

export let globalFetchCalls = 0;
globalThis.fetch = () => {
  globalFetchCalls++;
  throw new Error("Unexpected global fetch: inject a test fetch instead");
};
