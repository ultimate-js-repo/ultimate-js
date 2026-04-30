import React from "react";
import type { DocumentHead } from "@ultimate-js/core";

export const head: DocumentHead = {
  title: "My Ultimate.js App",
  lang: "en",
  styles: [`
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --bg: #09090b;
      --surface: #141416;
      --surface-raised: #1a1a1e;
      --border: #27272a;
      --border-hover: #3f3f46;
      --text: #fafafa;
      --text-secondary: #a1a1aa;
      --text-tertiary: #71717a;
      --accent: #6366f1;
      --accent-light: #818cf8;
      --accent-bg: rgba(99, 102, 241, 0.06);
      --accent-border: rgba(99, 102, 241, 0.2);
      --green: #34d399;
      --green-bg: rgba(52, 211, 153, 0.08);
      --green-border: rgba(52, 211, 153, 0.2);
      --radius: 12px;
      --radius-sm: 8px;
      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      --font-mono: "SF Mono", "Fira Code", Menlo, monospace;
      --transition: 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    body {
      font-family: var(--font-sans);
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      min-height: 100vh;
    }

    #root { min-height: 100vh; }

    .shell { max-width: 800px; margin: 0 auto; padding: 0 24px; }

    .nav {
      position: sticky; top: 0; z-index: 100;
      background: rgba(9,9,11,0.85); backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
    }
    .nav-inner {
      max-width: 800px; margin: 0 auto; padding: 0 24px;
      height: 56px; display: flex; align-items: center; gap: 24px;
    }
    .nav-brand {
      font-weight: 700; font-size: 16px; color: var(--text);
      text-decoration: none; letter-spacing: -0.02em;
    }
    .nav-links { display: flex; gap: 4px; list-style: none; }
    .nav-links a {
      padding: 6px 12px; border-radius: var(--radius-sm);
      color: var(--text-secondary); text-decoration: none;
      font-size: 14px; font-weight: 500;
      transition: color var(--transition), background var(--transition);
    }
    .nav-links a:hover { color: var(--text); background: var(--surface); }

    .hero { padding: 80px 0 48px; text-align: center; }
    .hero h1 {
      font-size: 48px; font-weight: 800; letter-spacing: -0.04em;
      background: linear-gradient(135deg, var(--text), var(--accent-light));
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text; margin-bottom: 12px;
    }
    .hero p { color: var(--text-secondary); font-size: 18px; }

    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 40px 0; }
    @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }

    .demo-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); overflow: hidden;
      transition: border-color var(--transition);
    }
    .demo-card:hover { border-color: var(--border-hover); }
    .demo-card-header { padding: 16px 20px 12px; border-bottom: 1px solid var(--border); }
    .demo-card-tag {
      display: inline-block; padding: 2px 8px; border-radius: 6px;
      font-size: 11px; font-weight: 600; font-family: var(--font-mono);
      text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 8px;
    }
    .demo-card-tag--server { background: var(--accent-bg); border: 1px solid var(--accent-border); color: var(--accent-light); }
    .demo-card-tag--client { background: var(--green-bg); border: 1px solid var(--green-border); color: var(--green); }
    .demo-card-title { font-size: 15px; font-weight: 600; }
    .demo-card-subtitle { font-size: 13px; color: var(--text-tertiary); margin-top: 2px; }
    .demo-card-body { padding: 20px; }

    .counter-display { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 16px; }
    .counter-value { font-size: 48px; font-weight: 700; font-family: var(--font-mono); min-width: 80px; text-align: center; }
    .counter-value--loading { color: var(--text-tertiary); }
    .counter-btn {
      width: 40px; height: 40px; border-radius: 50%;
      border: 1px solid var(--border); background: var(--surface-raised);
      color: var(--text); font-size: 18px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all var(--transition); font-family: var(--font-mono);
    }
    .counter-btn:hover { background: var(--accent); border-color: var(--accent); color: white; }
    .counter-btn:active { transform: scale(0.92); }
    .counter-info { text-align: center; font-size: 12px; color: var(--text-tertiary); font-family: var(--font-mono); }

    .user-fetch-btn {
      width: 100%; padding: 10px 16px; border-radius: var(--radius-sm);
      border: 1px solid var(--accent-border); background: var(--accent-bg);
      color: var(--accent-light); font-size: 14px; font-weight: 600;
      cursor: pointer; transition: all var(--transition); margin-bottom: 16px;
    }
    .user-fetch-btn:hover { background: var(--accent); border-color: var(--accent); color: white; }
    .user-fetch-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .user-profile {
      display: flex; align-items: center; gap: 14px; padding: 14px;
      background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius);
      animation: fadeIn 250ms ease-out;
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    .user-avatar {
      width: 44px; height: 44px; border-radius: 50%;
      background: linear-gradient(135deg, var(--accent), #a855f7);
      display: flex; align-items: center; justify-content: center;
      font-size: 15px; font-weight: 700; color: white; flex-shrink: 0;
    }
    .user-info { flex: 1; }
    .user-name { font-size: 14px; font-weight: 600; }
    .user-meta { font-size: 13px; color: var(--text-secondary); margin-top: 1px; }
    .user-role {
      display: inline-block; margin-top: 4px; padding: 2px 8px; border-radius: 4px;
      font-size: 11px; font-weight: 600; font-family: var(--font-mono);
      background: var(--green-bg); border: 1px solid var(--green-border); color: var(--green);
    }
    .user-empty { text-align: center; padding: 20px 0; color: var(--text-tertiary); font-size: 14px; }

    .loading-spinner {
      display: inline-block; width: 14px; height: 14px;
      border: 2px solid var(--border); border-top-color: var(--accent);
      border-radius: 50%; animation: spin 0.6s linear infinite;
      margin-right: 6px; vertical-align: middle;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .footer { padding: 48px 0 32px; text-align: center; color: var(--text-tertiary); font-size: 13px; }
    .footer a { color: var(--accent-light); text-decoration: none; }
  `],
};

export default function Layout({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div>
      <nav className="nav">
        <div className="nav-inner">
          <a href="/" className="nav-brand">My App</a>
          <ul className="nav-links">
            <li><a href="/">Home</a></li>
            <li><a href="/about">About</a></li>
          </ul>
        </div>
      </nav>
      {children}
    </div>
  );
}
