"use client";

import React, { useState } from "react";
import { streamDemoText } from "../functions/stream.ts";

export function StreamTextCard(): React.ReactElement {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chunkCount, setChunkCount] = useState<number | null>(null);

  async function handleStream() {
    setText("");
    setError(null);
    setChunkCount(null);
    setStreaming(true);

    try {
      const result = await streamDemoText((chunk: string) => {
        setText((current) => current + String(chunk));
      });
      setChunkCount(result.chunks);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="demo-card demo-card--wide">
      <div className="demo-card-header">
        <div className="demo-card-tag demo-card-tag--stream">SSE Stream</div>
        <div className="demo-card-title">Streaming Text</div>
        <div className="demo-card-subtitle">
          Server chunks arrive through cursor-resumable RPC
        </div>
      </div>
      <div className="demo-card-body">
        <button
          type="button"
          className="stream-btn"
          onClick={handleStream}
          disabled={streaming}
        >
          {streaming ? "Streaming..." : "Stream Text"}
        </button>

        <div className="stream-output" aria-live="polite">
          {text || "Click the button to stream text from the server"}
          {streaming ? <span className="stream-caret" /> : null}
        </div>

        {chunkCount !== null
          ? <div className="stream-meta">{chunkCount} chunks delivered</div>
          : null}
        {error ? <div className="stream-error">{error}</div> : null}
      </div>
    </div>
  );
}
