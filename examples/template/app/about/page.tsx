import React from "react";
import { Link } from "@ultimate-js/react";

export default function AboutPage(): React.ReactElement {
  return (
    <div className="shell" style={{ padding: "80px 24px" }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 12 }}>About</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>
        This page demonstrates file-based routing.
        Create a new directory with a page.tsx to add more routes.
      </p>
      <Link href="/" style={{ color: "var(--accent-light)", textDecoration: "none" }}>
        &larr; Back home
      </Link>
    </div>
  );
}
