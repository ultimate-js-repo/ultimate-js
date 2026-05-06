// deno-lint-ignore-file jsx-curly-braces
import React, { useState } from "react";
import { CounterButton } from "./components/CounterButton.tsx";
import { StreamTextCard } from "./components/StreamTextCard.tsx";
import { UserCard } from "./components/UserCard.tsx";

export default function Page(): React.ReactElement {
  const [activeTab, setActiveTab] = useState(0);

  const codeTabs = [
    {
      name: "functions/user.ts",
      label: "Server",
      code: (
        <pre>
          <span className="cm">{"// This runs on the server — never shipped to the browser\n"}</span>
          <span className="kw">{"export async function "}</span>
          <span className="fn">{"getRandomUser"}</span>
          {"() {\n"}
          {"  "}
          <span className="kw">{"await "}</span>
          {"delay("}
          <span className="str">{"300"}</span>
          {")\n"}
          {"  "}
          <span className="kw">{"const "}</span>
          {"index = Math.floor(Math.random() * users.length)\n"}
          {"  "}
          <span className="kw">{"return "}</span>
          {"users[index]\n"}
          {"}\n"}
        </pre>
      ),
    },
    {
      name: "components/UserCard.tsx",
      label: "Client",
      code: (
        <pre>
          <span className="str">{'"use client"\n\n'}</span>
          <span className="kw">{"import "}</span>
          {"{ "}
          <span className="fn">{"getRandomUser"}</span>
          {" } "}
          <span className="kw">{"from "}</span>
          <span className="str">{'"../functions/user.ts"'}</span>
          {"\n\n"}
          <span className="cm">{"// Ultimate.js compiles this into an RPC call automatically\n"}</span>
          <span className="kw">{"const "}</span>
          {"user = "}
          <span className="kw">{"await "}</span>
          <span className="fn">{"getRandomUser"}</span>
          {"()  "}
          <span className="cm">{"// ← Network call, type-safe"}</span>
          {"\n"}
        </pre>
      ),
    },
    {
      name: "routes/index.tsx",
      label: "Route",
      code: (
        <pre>
          <span className="cm">{"// File-based routing: app/routes/index.tsx → /\n\n"}</span>
          <span className="kw">{"export default function "}</span>
          <span className="fn">{"Page"}</span>
          {"() {\n"}
          {"  "}
          <span className="kw">{"return "}</span>
          {"(\n"}
          {"    <"}
          <span className="type">{"main"}</span>
          {">\n"}
          {"      <"}
          <span className="type">{"CounterButton"}</span>
          {" />\n"}
          {"      <"}
          <span className="type">{"UserCard"}</span>
          {" />\n"}
          {"    </"}
          <span className="type">{"main"}</span>
          {">\n"}
          {"  )\n"}
          {"}\n"}
        </pre>
      ),
    },
  ];

  return (
    <div>
      {/* ─── Navigation ─── */}
      <nav className="nav">
        <div className="nav-inner">
          <a href="/" className="nav-brand">
            <div className="nav-logo">U</div>
            Ultimate.js
          </a>
          <ul className="nav-links">
            <li>
              <a href="#features">Features</a>
            </li>
            <li>
              <a href="#demo">Demo</a>
            </li>
            <li>
              <a href="#code">Code</a>
            </li>
          </ul>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="hero">
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          Built on Deno 2
        </div>
        <h1 className="hero-title">Ultimate.js</h1>
        <p className="hero-subtitle">
          Full-stack Deno framework with transparent server calls. Write server
          functions, import them in the client — the compiler does the rest.
        </p>
        <div className="hero-techs">
          <span className="tech-badge">Deno 2</span>
          <span className="tech-badge">React 19</span>
          <span className="tech-badge">Hono</span>
          <span className="tech-badge">TypeScript</span>
          <span className="tech-badge">Telefunc RPC</span>
        </div>
      </section>

      <div className="divider">
        <hr />
      </div>

      {/* ─── Features ─── */}
      <section className="section" id="features">
        <div className="section-label">Features</div>
        <h2 className="section-title">Why Ultimate.js?</h2>
        <p className="section-desc">
          A self-contained framework that handles routing, code splitting, and
          server communication — no glue code needed.
        </p>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon feature-icon--rpc">{"//"}</div>
            <div className="feature-title">Transparent RPC</div>
            <div className="feature-desc">
              Import server functions in client code. The compiler replaces them
              with type-safe RPC calls automatically. No API routes, no fetch
              boilerplate.
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon feature-icon--route">{"/"}</div>
            <div className="feature-title">File-Based Routing</div>
            <div className="feature-desc">
              Drop a .tsx file in app/routes/ and it becomes a page. Dynamic
              params with [id].tsx, catch-all with [...path].tsx. Built-in SPA
              navigation.
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon feature-icon--split">{"{ }"}</div>
            <div className="feature-title">Smart Code Classification</div>
            <div className="feature-desc">
              Functions are classified as client, server, or shared at build
              time. Server code never reaches the browser. Illegal cross-calls
              are caught early.
            </div>
          </div>
        </div>
      </section>

      <div className="divider">
        <hr />
      </div>

      {/* ─── Interactive Demo ─── */}
      <section className="section" id="demo">
        <div className="section-label">Interactive</div>
        <h2 className="section-title">Try It Live</h2>
        <p className="section-desc">
          These demos call real server functions via RPC. The server state
          persists across clicks.
        </p>

        <div className="demo-grid">
          <CounterButton />
          <UserCard />
          <StreamTextCard />
        </div>
      </section>

      <div className="divider">
        <hr />
      </div>

      {/* ─── Code Example ─── */}
      <section className="code-section" id="code">
        <div className="section-label">How It Works</div>
        <h2 className="section-title" style={{ marginBottom: 16 }}>
          The Magic
        </h2>
        <p className="section-desc">
          Write server functions as plain TypeScript. Import them in client
          code. Ultimate.js handles serialization, transport, and error
          propagation.
        </p>

        <div className="code-block">
          <div className="code-tabs">
            {codeTabs.map((tab, i) => (
              <button
                type="button"
                key={tab.name}
                className={i === activeTab
                  ? "code-tab code-tab--active"
                  : "code-tab"}
                onClick={() => setActiveTab(i)}
              >
                {tab.name}
              </button>
            ))}
          </div>
          <div className="code-content">
            {codeTabs[activeTab].code}
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="footer">
        <p className="footer-text">
          Built with Ultimate.js — Deno + React + Hono
        </p>
      </footer>
    </div>
  );
}
