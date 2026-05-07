// deno-lint-ignore-file jsx-curly-braces
import React, { useState } from "react";
import { CounterButton } from "./components/CounterButton.tsx";
import { StreamTextCard } from "./components/StreamTextCard.tsx";
import { UserCard } from "./components/UserCard.tsx";

const capabilities = [
  {
    eyebrow: "Transport",
    title: "Server functions import like local modules",
    description:
      "Write server-only TypeScript and call it from client components. Ultimate rewrites the boundary into RPC transport while keeping the call site boring.",
  },
  {
    eyebrow: "Compiler",
    title: "Client and server code stay separated",
    description:
      "The analyzer classifies code before bundling, catches illegal crossings, and keeps server implementation details out of browser assets.",
  },
  {
    eyebrow: "Runtime",
    title: "Streaming callbacks are part of the protocol",
    description:
      "Cursor-bearing SSE events can resume streams and invoke encoded client callbacks without asking app code to wire low-level channels.",
  },
];

const pipeline = [
  {
    label: "1",
    title: "Scan app",
    detail:
      "Routes, layouts, server functions, and client islands are analyzed.",
  },
  {
    label: "2",
    title: "Generate boundary",
    detail: "RPC metadata and entries are emitted for the selected bundler.",
  },
  {
    label: "3",
    title: "Ship split output",
    detail:
      "Browser assets land in dist/client; server code lands in dist/server.",
  },
];

export default function Page(): React.ReactElement {
  const [activeTab, setActiveTab] = useState(0);

  const codeTabs = [
    {
      name: "functions/user.ts",
      label: "Server function",
      code: (
        <pre>
          <span className="cm">{"// Runs on the server and never ships to the browser\n"}</span>
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
      label: "Client import",
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
          <span className="cm">{"// The compiler turns this into a typed RPC request\n"}</span>
          <span className="kw">{"const "}</span>
          {"user = "}
          <span className="kw">{"await "}</span>
          <span className="fn">{"getRandomUser"}</span>
          {"()\n"}
        </pre>
      ),
    },
    {
      name: "dist/output",
      label: "Build output",
      code: (
        <pre>
          <span className="cm">{"# Build artifacts are emitted into separate targets\n\n"}</span>
          {"dist/client/index.html\n"}
          {"dist/client/assets/client.js\n\n"}
          {"dist/server/main.ts\n"}
          {"dist/server/server.js\n\n"}
        </pre>
      ),
    },
  ];

  return (
    <div className="app-shell">
      <nav className="nav">
        <div className="nav-inner">
          <a href="/" className="nav-brand" aria-label="Ultimate.js home">
            <span className="nav-logo">U</span>
            <span>Ultimate.js</span>
          </a>
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="hero-kicker">
              <span className="status-light" />
              Full-stack Deno framework
            </div>
            <h1 className="hero-title">Ultimate.js</h1>
            <p className="hero-subtitle">
              Build React apps where server functions feel local, runtime
              defaults stay explicit, and compiler analysis keeps the client
              bundle honest.
            </p>
            <div className="hero-actions">
              <a className="primary-action" href="#demo">Try the RPC demo</a>
              <a className="secondary-action" href="#code">Inspect the code</a>
            </div>
          </div>

          <div className="hero-panel" aria-label="Ultimate.js build pipeline">
            <div className="panel-topbar">
              <span />
              <span />
              <span />
              <strong>ultimate build</strong>
            </div>
            <div className="flow">
              <div className="flow-node flow-node--client">
                <span>Client</span>
                <strong>UserCard.tsx</strong>
              </div>
              <div className="flow-arrow">RPC</div>
              <div className="flow-node flow-node--server">
                <span>Server</span>
                <strong>getRandomUser()</strong>
              </div>
            </div>
            <div className="artifact-grid">
              <div>
                <span>dist/client</span>
                <strong>Browser assets</strong>
              </div>
              <div>
                <span>dist/server</span>
                <strong>Runtime entry</strong>
              </div>
            </div>
            <div className="panel-log">
              <span className="log-ok">ok</span>
              <span>classified routes, RPC calls, and streaming callbacks</span>
            </div>
          </div>
        </section>

        <section className="section" id="capabilities">
          <div className="section-heading">
            <div>
              <span className="section-label">Capabilities</span>
              <h2>Core framework capabilities</h2>
            </div>
            <p>
              This example focuses on the everyday building blocks of an
              Ultimate.js app: client interactivity, server state, streamed
              callbacks, and separated build output.
            </p>
          </div>

          <div className="capability-grid">
            {capabilities.map((item) => (
              <article className="capability-card" key={item.title}>
                <span>{item.eyebrow}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section--split">
          <div className="section-heading section-heading--compact">
            <div>
              <span className="section-label">Pipeline</span>
              <h2>From app files to split artifacts</h2>
            </div>
          </div>
          <div className="pipeline">
            {pipeline.map((step) => (
              <div className="pipeline-step" key={step.title}>
                <span className="pipeline-index">{step.label}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="section" id="demo">
          <div className="section-heading">
            <div>
              <span className="section-label">Interactive</span>
              <h2>Live server calls</h2>
            </div>
            <p>
              These controls call real server functions through the framework
              RPC layer. The counter state lives server-side, the user profile
              is fetched on demand, and the text stream arrives in chunks.
            </p>
          </div>

          <div className="demo-grid">
            <CounterButton />
            <UserCard />
            <StreamTextCard />
          </div>
        </section>

        <section className="section" id="code">
          <div className="section-heading">
            <div>
              <span className="section-label">Code</span>
              <h2>Plain TypeScript at the boundary</h2>
            </div>
            <p>
              The page keeps framework mechanics visible without forcing demo
              code to own fetch handlers, route glue, or generated artifacts.
            </p>
          </div>

          <div className="code-block">
            <div
              className="code-tabs"
              role="tablist"
              aria-label="Code examples"
            >
              {codeTabs.map((tab, i) => (
                <button
                  type="button"
                  key={tab.name}
                  className={i === activeTab
                    ? "code-tab code-tab--active"
                    : "code-tab"}
                  onClick={() => setActiveTab(i)}
                  role="tab"
                  aria-selected={i === activeTab}
                >
                  <span>{tab.label}</span>
                  <strong>{tab.name}</strong>
                </button>
              ))}
            </div>
            <div className="code-content">
              {codeTabs[activeTab].code}
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>Built with Ultimate.js on Deno, React, and Hono.</p>
      </footer>
    </div>
  );
}
