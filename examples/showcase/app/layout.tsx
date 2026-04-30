import React from "react";
import type { DocumentHead } from "@ultimate-js/core";

export const head: DocumentHead = {
  title: "Ultimate.js - The Full-Stack Deno Framework",
  lang: "en",
  styles: [`
      *,
      *::before,
      *::after {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      :root {
        --bg: #09090b;
        --bg-subtle: #0c0c0f;
        --surface: #141416;
        --surface-raised: #1a1a1e;
        --surface-hover: #222226;
        --border: #27272a;
        --border-hover: #3f3f46;
        --text: #fafafa;
        --text-secondary: #a1a1aa;
        --text-tertiary: #71717a;
        --accent: #6366f1;
        --accent-light: #818cf8;
        --accent-dim: #4f46e5;
        --accent-bg: rgba(99, 102, 241, 0.06);
        --accent-border: rgba(99, 102, 241, 0.2);
        --accent-glow: rgba(99, 102, 241, 0.15);
        --violet: #a855f7;
        --green: #34d399;
        --green-bg: rgba(52, 211, 153, 0.08);
        --green-border: rgba(52, 211, 153, 0.2);
        --amber: #fbbf24;
        --amber-bg: rgba(251, 191, 36, 0.08);
        --red: #f87171;
        --radius: 12px;
        --radius-lg: 16px;
        --radius-sm: 8px;
        --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
          Oxygen, Ubuntu, Cantarell, sans-serif;
        --font-mono: "SFMono-Regular", "Cascadia Code", "Fira Code", "JetBrains Mono",
          Menlo, Consolas, monospace;
        --max-width: 1100px;
        --transition: 150ms cubic-bezier(0.4, 0, 0.2, 1);
      }

      html { scroll-behavior: smooth; }

      body {
        font-family: var(--font-sans);
        background: var(--bg);
        color: var(--text);
        line-height: 1.65;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        min-height: 100vh;
      }

      #root { min-height: 100vh; }

      .nav { position: sticky; top: 0; z-index: 100; background: rgba(9,9,11,0.8); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); }
      .nav-inner { max-width: var(--max-width); margin: 0 auto; padding: 0 24px; height: 60px; display: flex; align-items: center; justify-content: space-between; }
      .nav-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; color: var(--text); font-weight: 700; font-size: 18px; letter-spacing: -0.02em; }
      .nav-logo { width: 28px; height: 28px; background: linear-gradient(135deg, var(--accent), var(--violet)); border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; color: white; }
      .nav-links { display: flex; gap: 8px; list-style: none; }
      .nav-links a { display: inline-flex; align-items: center; padding: 6px 14px; border-radius: var(--radius-sm); color: var(--text-secondary); text-decoration: none; font-size: 14px; font-weight: 500; transition: color var(--transition), background var(--transition); }
      .nav-links a:hover { color: var(--text); background: var(--surface); }

      .hero { max-width: var(--max-width); margin: 0 auto; padding: 100px 24px 80px; text-align: center; position: relative; }
      .hero::before { content: ""; position: absolute; top: -60px; left: 50%; transform: translateX(-50%); width: 600px; height: 400px; background: radial-gradient(ellipse at center, var(--accent-glow) 0%, transparent 70%); pointer-events: none; z-index: 0; }
      .hero-badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 16px; border-radius: 20px; background: var(--accent-bg); border: 1px solid var(--accent-border); color: var(--accent-light); font-size: 13px; font-weight: 500; margin-bottom: 32px; position: relative; z-index: 1; }
      .hero-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); animation: pulse 2s ease-in-out infinite; }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      .hero-title { font-size: clamp(48px, 8vw, 80px); font-weight: 800; letter-spacing: -0.04em; line-height: 1.05; margin-bottom: 20px; position: relative; z-index: 1; background: linear-gradient(135deg, var(--text) 0%, var(--accent-light) 50%, var(--violet) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
      .hero-subtitle { font-size: clamp(18px, 2.5vw, 22px); color: var(--text-secondary); max-width: 560px; margin: 0 auto 40px; line-height: 1.5; position: relative; z-index: 1; }
      .hero-techs { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; position: relative; z-index: 1; }
      .tech-badge { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: var(--radius-sm); background: var(--surface); border: 1px solid var(--border); color: var(--text-secondary); font-size: 13px; font-weight: 500; font-family: var(--font-mono); transition: border-color var(--transition), color var(--transition); }
      .tech-badge:hover { border-color: var(--border-hover); color: var(--text); }

      .section { max-width: var(--max-width); margin: 0 auto; padding: 80px 24px; }
      .section-label { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent); margin-bottom: 12px; }
      .section-title { font-size: 32px; font-weight: 700; letter-spacing: -0.03em; margin-bottom: 16px; }
      .section-desc { font-size: 16px; color: var(--text-secondary); max-width: 520px; margin-bottom: 48px; }

      .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
      @media (max-width: 768px) { .features-grid { grid-template-columns: 1fr; } }
      .feature-card { padding: 28px 24px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); transition: border-color var(--transition), background var(--transition), transform var(--transition); }
      .feature-card:hover { border-color: var(--border-hover); background: var(--surface-raised); transform: translateY(-2px); }
      .feature-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; margin-bottom: 16px; font-family: var(--font-mono); }
      .feature-icon--rpc { background: var(--accent-bg); border: 1px solid var(--accent-border); color: var(--accent-light); }
      .feature-icon--route { background: var(--green-bg); border: 1px solid var(--green-border); color: var(--green); }
      .feature-icon--split { background: var(--amber-bg); border: 1px solid rgba(251, 191, 36, 0.2); color: var(--amber); }
      .feature-title { font-size: 17px; font-weight: 600; margin-bottom: 8px; letter-spacing: -0.01em; }
      .feature-desc { font-size: 14px; color: var(--text-secondary); line-height: 1.6; }

      .demo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      @media (max-width: 768px) { .demo-grid { grid-template-columns: 1fr; } }
      .demo-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; transition: border-color var(--transition); }
      .demo-card:hover { border-color: var(--border-hover); }
      .demo-card-header { padding: 20px 24px 16px; border-bottom: 1px solid var(--border); }
      .demo-card-tag { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; }
      .demo-card-tag--server { background: var(--accent-bg); border: 1px solid var(--accent-border); color: var(--accent-light); }
      .demo-card-tag--client { background: var(--green-bg); border: 1px solid var(--green-border); color: var(--green); }
      .demo-card-title { font-size: 16px; font-weight: 600; letter-spacing: -0.01em; }
      .demo-card-subtitle { font-size: 13px; color: var(--text-tertiary); margin-top: 4px; }
      .demo-card-body { padding: 24px; }

      .counter-display { display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 20px; }
      .counter-value { font-size: 56px; font-weight: 700; font-family: var(--font-mono); letter-spacing: -0.03em; color: var(--text); min-width: 100px; text-align: center; transition: color var(--transition); }
      .counter-value--loading { color: var(--text-tertiary); }
      .counter-btn { width: 44px; height: 44px; border-radius: 50%; border: 1px solid var(--border); background: var(--surface-raised); color: var(--text); font-size: 20px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all var(--transition); font-family: var(--font-mono); }
      .counter-btn:hover { background: var(--accent); border-color: var(--accent); color: white; transform: scale(1.08); }
      .counter-btn:active { transform: scale(0.95); }
      .counter-info { text-align: center; font-size: 12px; color: var(--text-tertiary); font-family: var(--font-mono); }

      .user-fetch-btn { width: 100%; padding: 12px 20px; border-radius: var(--radius-sm); border: 1px solid var(--accent-border); background: var(--accent-bg); color: var(--accent-light); font-size: 14px; font-weight: 600; cursor: pointer; transition: all var(--transition); font-family: var(--font-sans); margin-bottom: 20px; }
      .user-fetch-btn:hover { background: var(--accent); border-color: var(--accent); color: white; }
      .user-fetch-btn:active { transform: scale(0.98); }
      .user-fetch-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
      .user-profile { display: flex; align-items: center; gap: 16px; padding: 16px; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); animation: fadeIn 300ms ease-out; }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      .user-avatar { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, var(--accent), var(--violet)); display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; color: white; flex-shrink: 0; }
      .user-info { flex: 1; min-width: 0; }
      .user-name { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; }
      .user-meta { font-size: 13px; color: var(--text-secondary); margin-top: 2px; }
      .user-role { display: inline-block; margin-top: 6px; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; font-family: var(--font-mono); background: var(--green-bg); border: 1px solid var(--green-border); color: var(--green); }
      .user-empty { text-align: center; padding: 24px 0; color: var(--text-tertiary); font-size: 14px; }

      .code-section { max-width: var(--max-width); margin: 0 auto; padding: 0 24px 80px; }
      .code-block { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }
      .code-tabs { display: flex; border-bottom: 1px solid var(--border); overflow-x: auto; }
      .code-tab { padding: 12px 20px; font-size: 13px; font-family: var(--font-mono); color: var(--text-tertiary); border-bottom: 2px solid transparent; cursor: pointer; white-space: nowrap; background: none; border-top: none; border-left: none; border-right: none; transition: color var(--transition); }
      .code-tab:hover { color: var(--text-secondary); }
      .code-tab--active { color: var(--accent-light); border-bottom-color: var(--accent); }
      .code-content { padding: 24px; }
      .code-content pre { font-family: var(--font-mono); font-size: 13.5px; line-height: 1.7; color: var(--text-secondary); overflow-x: auto; }
      .code-content .kw { color: var(--accent-light); }
      .code-content .fn { color: #ddd6fe; }
      .code-content .str { color: var(--green); }
      .code-content .cm { color: var(--text-tertiary); font-style: italic; }
      .code-content .type { color: var(--amber); }

      .divider { max-width: var(--max-width); margin: 0 auto; padding: 0 24px; }
      .divider hr { border: none; border-top: 1px solid var(--border); }
      .footer { max-width: var(--max-width); margin: 0 auto; padding: 40px 24px; text-align: center; }
      .footer-text { font-size: 14px; color: var(--text-tertiary); }
      .footer-text a { color: var(--accent-light); text-decoration: none; }
      .footer-text a:hover { text-decoration: underline; }

      .loading-spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.6s linear infinite; margin-right: 8px; vertical-align: middle; }
      @keyframes spin { to { transform: rotate(360deg); } }
  `],
};

export default function Layout({ children }: { children: React.ReactNode }): React.ReactElement {
  return <>{children}</>;
}
