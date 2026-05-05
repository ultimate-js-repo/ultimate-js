import React from "react";
import { CounterButton } from "./components/CounterButton.tsx";
import { UserCard } from "./components/UserCard.tsx";

export default function HomePage(): React.ReactElement {
  return (
    <div className="shell">
      <section className="hero">
        <h1>Ultimate.js</h1>
        <p>Edit app/page.tsx to get started.</p>
      </section>

      <div className="grid">
        <CounterButton />
        <UserCard />
      </div>

      <footer className="footer">
        Built with{" "}
        <a href="https://github.com/ultimate-js-repo/ultimate-js">
          Ultimate.js
        </a>
      </footer>
    </div>
  );
}
