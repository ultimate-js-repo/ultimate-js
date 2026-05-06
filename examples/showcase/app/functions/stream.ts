const demoText =
  "Ultimate streams this sentence from a server function, one phrase at a time, while the browser renders each chunk as it arrives.";

export async function streamDemoText(
  callbackFn: (chunk: string) => void | Promise<void>,
): Promise<{ chunks: number }> {
  const chunks = demoText.match(/.{1,18}(\s|$)/g) ?? [demoText];

  for (const chunk of chunks) {
    await new Promise((resolve) => setTimeout(resolve, 180));
    await callbackFn(chunk);
  }

  return { chunks: chunks.length };
}
