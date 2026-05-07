const demoSentences = [
  "Ultimate streams a randomly selected long sentence from a server function, splitting the response into small chunks while the browser renders each callback as soon as it arrives.",
  "The same typed RPC boundary can carry server state, client callbacks, and streamed text without asking the application to wire custom fetch handlers or event channels.",
  "Every click asks the server for a fresh sample sentence, then delivers it through the cursor-aware streaming path so the demo feels alive instead of replaying one fixed phrase.",
  "Client components can import ordinary TypeScript functions while Ultimate keeps the server implementation private, compiles the boundary, and sends only the safe browser code downstream.",
];

export async function streamDemoText(
  callbackFn: (chunk: string) => void | Promise<void>,
): Promise<{ chunks: number }> {
  const text = demoSentences[Math.floor(Math.random() * demoSentences.length)];
  const chunks = text.match(/.{1,22}(\s|$)/g) ?? [text];

  for (const chunk of chunks) {
    await new Promise((resolve) => setTimeout(resolve, 180));
    await callbackFn(chunk);
  }

  return { chunks: chunks.length };
}
