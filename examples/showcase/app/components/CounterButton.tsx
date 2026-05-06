"use client";

import React, { useEffect, useState } from "react";
import {
  decrementCounter,
  getCounter,
  incrementCounter,
} from "../functions/counter.ts";

export function CounterButton(): React.ReactElement {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCounter().then(setCount);
  }, []);

  async function handleIncrement() {
    setLoading(true);
    const next = await incrementCounter();
    setCount(next);
    setLoading(false);
  }

  async function handleDecrement() {
    setLoading(true);
    const next = await decrementCounter();
    setCount(next);
    setLoading(false);
  }

  return (
    <div className="demo-card">
      <div className="demo-card-header">
        <div className="demo-card-tag demo-card-tag--server">Server State</div>
        <div className="demo-card-title">Server-Side Counter</div>
        <div className="demo-card-subtitle">
          State persists on the server via Telefunc RPC
        </div>
      </div>
      <div className="demo-card-body">
        <div className="counter-display">
          <button
            type="button"
            className="counter-btn"
            onClick={handleDecrement}
            disabled={loading}
          >
            -
          </button>
          <div
            className={count === null
              ? "counter-value counter-value--loading"
              : "counter-value"}
          >
            {count === null ? "--" : count}
          </div>
          <button
            type="button"
            className="counter-btn"
            onClick={handleIncrement}
            disabled={loading}
          >
            +
          </button>
        </div>
        <div className="counter-info">
          {loading
            ? "Calling server..."
            : "Each click triggers a server function call"}
        </div>
      </div>
    </div>
  );
}
