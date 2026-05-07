import React from "react";
import type { DocumentHead } from "@ultimate-js/core";

export const head: DocumentHead = {
  title: "Ultimate.js - Full-Stack Deno Framework",
  lang: "en",
  styles: [`
      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      :root {
        --bg: #0a0b0d;
        --bg-soft: #101318;
        --surface: #151922;
        --surface-raised: #1b202b;
        --surface-hover: #222838;
        --border: #2c3342;
        --border-strong: #465165;
        --text: #f7f8fb;
        --text-secondary: #bbc3d1;
        --text-tertiary: #7f899a;
        --indigo: #7c8cff;
        --indigo-soft: rgba(124, 140, 255, 0.13);
        --indigo-border: rgba(124, 140, 255, 0.34);
        --teal: #42d4b8;
        --teal-soft: rgba(66, 212, 184, 0.11);
        --teal-border: rgba(66, 212, 184, 0.3);
        --amber: #f6c85f;
        --amber-soft: rgba(246, 200, 95, 0.12);
        --amber-border: rgba(246, 200, 95, 0.32);
        --rose: #fb7185;
        --red: #ff7a7a;
        --radius: 8px;
        --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
          Oxygen, Ubuntu, Cantarell, sans-serif;
        --font-mono: "SFMono-Regular", "Cascadia Code", "Fira Code",
          "JetBrains Mono", Menlo, Consolas, monospace;
        --max-width: 1180px;
        --transition: 150ms cubic-bezier(0.4, 0, 0.2, 1);
      }

      html {
        scroll-behavior: smooth;
      }

      body {
        margin: 0;
        min-height: 100vh;
        background:
          linear-gradient(180deg, rgba(124, 140, 255, 0.08), transparent 420px),
          linear-gradient(90deg, rgba(66, 212, 184, 0.04), rgba(246, 200, 95, 0.04)),
          var(--bg);
        color: var(--text);
        font-family: var(--font-sans);
        line-height: 1.55;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      a {
        color: inherit;
      }

      button,
      input,
      textarea,
      select {
        font: inherit;
      }

      #root,
      .app-shell {
        min-height: 100vh;
      }

      .nav {
        position: sticky;
        top: 0;
        z-index: 100;
        border-bottom: 1px solid rgba(44, 51, 66, 0.76);
        background: rgba(10, 11, 13, 0.78);
        backdrop-filter: blur(16px);
      }

      .nav-inner {
        width: min(100%, var(--max-width));
        height: 64px;
        margin: 0 auto;
        padding: 0 24px;
        display: flex;
        align-items: center;
        justify-content: flex-start;
      }

      .nav-brand {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        color: var(--text);
        font-size: 17px;
        font-weight: 750;
        letter-spacing: 0;
        text-decoration: none;
        white-space: nowrap;
      }

      .nav-logo {
        width: 30px;
        height: 30px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--indigo-border);
        border-radius: var(--radius);
        background:
          linear-gradient(135deg, rgba(124, 140, 255, 0.9), rgba(66, 212, 184, 0.78));
        color: white;
        font-size: 14px;
        font-weight: 850;
      }

      .hero {
        width: min(100%, var(--max-width));
        margin: 0 auto;
        padding: 88px 24px 46px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(380px, 0.82fr);
        gap: 54px;
        align-items: center;
      }

      .hero-copy {
        min-width: 0;
      }

      .hero-kicker,
      .section-label {
        color: var(--teal);
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      .hero-kicker {
        display: inline-flex;
        align-items: center;
        gap: 9px;
        min-height: 32px;
        padding: 0 11px;
        border: 1px solid var(--teal-border);
        border-radius: var(--radius);
        background: var(--teal-soft);
      }

      .status-light {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--teal);
        box-shadow: 0 0 0 4px rgba(66, 212, 184, 0.11);
      }

      .hero-title {
        margin: 22px 0 18px;
        color: var(--text);
        font-size: clamp(54px, 7vw, 88px);
        font-weight: 850;
        letter-spacing: 0;
        line-height: 0.98;
      }

      .hero-subtitle {
        max-width: 660px;
        margin: 0;
        color: var(--text-secondary);
        font-size: 20px;
        line-height: 1.55;
      }

      .hero-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 34px;
      }

      .primary-action,
      .secondary-action {
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0 18px;
        border-radius: var(--radius);
        font-size: 14px;
        font-weight: 750;
        text-decoration: none;
        transition:
          transform var(--transition),
          border-color var(--transition),
          background var(--transition);
      }

      .primary-action {
        border: 1px solid var(--indigo-border);
        background: var(--indigo);
        color: #090a0c;
      }

      .secondary-action {
        border: 1px solid var(--border);
        background: rgba(21, 25, 34, 0.78);
        color: var(--text);
      }

      .primary-action:hover,
      .secondary-action:hover {
        transform: translateY(-1px);
      }

      .secondary-action:hover {
        border-color: var(--border-strong);
        background: var(--surface-hover);
      }

      .hero-panel,
      .code-block,
      .demo-card,
      .capability-card,
      .pipeline-step {
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: rgba(21, 25, 34, 0.86);
        box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22);
      }

      .hero-panel {
        overflow: hidden;
      }

      .panel-topbar {
        min-height: 48px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 16px;
        border-bottom: 1px solid var(--border);
        background: rgba(27, 32, 43, 0.82);
        color: var(--text-tertiary);
        font-family: var(--font-mono);
        font-size: 12px;
      }

      .panel-topbar span {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: var(--border-strong);
      }

      .panel-topbar span:nth-child(1) {
        background: var(--rose);
      }

      .panel-topbar span:nth-child(2) {
        background: var(--amber);
      }

      .panel-topbar span:nth-child(3) {
        background: var(--teal);
      }

      .panel-topbar strong {
        margin-left: auto;
        color: var(--text-secondary);
        font-weight: 650;
      }

      .flow {
        padding: 24px;
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: 12px;
        align-items: center;
      }

      .flow-node {
        min-height: 116px;
        padding: 18px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--bg-soft);
      }

      .flow-node span,
      .artifact-grid span,
      .metric span {
        color: var(--text-tertiary);
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: 650;
      }

      .flow-node strong,
      .artifact-grid strong {
        color: var(--text);
        font-size: 15px;
        overflow-wrap: anywhere;
      }

      .flow-node--client {
        border-color: var(--indigo-border);
      }

      .flow-node--server {
        border-color: var(--teal-border);
      }

      .flow-arrow {
        min-width: 58px;
        min-height: 34px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--amber-border);
        border-radius: var(--radius);
        background: var(--amber-soft);
        color: var(--amber);
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: 800;
      }

      .artifact-grid {
        padding: 0 24px 24px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .artifact-grid div {
        min-height: 84px;
        padding: 14px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: rgba(10, 11, 13, 0.58);
      }

      .panel-log {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 24px 18px;
        border-top: 1px solid var(--border);
        color: var(--text-secondary);
        font-family: var(--font-mono);
        font-size: 12px;
      }

      .log-ok {
        padding: 2px 7px;
        border: 1px solid var(--teal-border);
        border-radius: 5px;
        background: var(--teal-soft);
        color: var(--teal);
        font-weight: 800;
      }

      .section,
      .footer {
        width: min(100%, var(--max-width));
        margin: 0 auto;
        padding-left: 24px;
        padding-right: 24px;
      }

      .section {
        padding-top: 68px;
        padding-bottom: 68px;
        border-top: 1px solid rgba(44, 51, 66, 0.72);
      }

      .section-heading {
        display: grid;
        grid-template-columns: minmax(0, 0.9fr) minmax(280px, 0.7fr);
        gap: 36px;
        align-items: end;
        margin-bottom: 28px;
      }

      .section-heading--compact {
        display: block;
      }

      .section h2 {
        margin: 8px 0 0;
        color: var(--text);
        font-size: clamp(30px, 4vw, 46px);
        font-weight: 820;
        letter-spacing: 0;
        line-height: 1.05;
      }

      .section-heading p {
        margin: 0;
        color: var(--text-secondary);
        font-size: 16px;
        line-height: 1.7;
      }

      .capability-grid,
      .demo-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
      }

      .capability-card {
        min-height: 254px;
        padding: 24px;
        box-shadow: none;
      }

      .capability-card span,
      .demo-card-tag {
        display: inline-flex;
        align-items: center;
        min-height: 26px;
        padding: 0 9px;
        border-radius: 6px;
        font-family: var(--font-mono);
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      .capability-card span {
        border: 1px solid var(--indigo-border);
        background: var(--indigo-soft);
        color: var(--indigo);
      }

      .capability-card h3 {
        margin: 22px 0 12px;
        color: var(--text);
        font-size: 20px;
        font-weight: 780;
        line-height: 1.2;
      }

      .capability-card p,
      .pipeline-step p {
        margin: 0;
        color: var(--text-secondary);
        font-size: 14px;
        line-height: 1.65;
      }

      .section--split {
        display: grid;
        grid-template-columns: minmax(280px, 0.6fr) minmax(0, 1fr);
        gap: 34px;
        align-items: start;
      }

      .pipeline {
        display: grid;
        gap: 12px;
      }

      .pipeline-step {
        min-height: 112px;
        padding: 18px;
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 16px;
        align-items: start;
        box-shadow: none;
      }

      .pipeline-index {
        width: 34px;
        height: 34px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--teal-border);
        border-radius: var(--radius);
        background: var(--teal-soft);
        color: var(--teal);
        font-family: var(--font-mono);
        font-size: 13px;
        font-weight: 850;
      }

      .pipeline-step h3 {
        margin: 0 0 7px;
        color: var(--text);
        font-size: 17px;
      }

      .demo-grid {
        grid-template-columns: 1fr 1fr;
      }

      .demo-card {
        overflow: hidden;
        transition: border-color var(--transition), background var(--transition);
      }

      .demo-card--wide {
        grid-column: 1 / -1;
      }

      .demo-card:hover {
        border-color: var(--border-strong);
        background: var(--surface-raised);
      }

      .demo-card-header {
        padding: 20px 22px 16px;
        border-bottom: 1px solid var(--border);
        background: rgba(10, 11, 13, 0.26);
      }

      .demo-card-tag {
        margin-bottom: 12px;
      }

      .demo-card-tag--server {
        border: 1px solid var(--indigo-border);
        background: var(--indigo-soft);
        color: var(--indigo);
      }

      .demo-card-tag--client {
        border: 1px solid var(--teal-border);
        background: var(--teal-soft);
        color: var(--teal);
      }

      .demo-card-tag--stream {
        border: 1px solid var(--amber-border);
        background: var(--amber-soft);
        color: var(--amber);
      }

      .demo-card-title {
        color: var(--text);
        font-size: 18px;
        font-weight: 780;
      }

      .demo-card-subtitle {
        margin-top: 4px;
        color: var(--text-tertiary);
        font-size: 13px;
      }

      .demo-card-body {
        padding: 22px;
      }

      .counter-display {
        min-height: 104px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 18px;
        margin-bottom: 16px;
      }

      .counter-value {
        min-width: 104px;
        color: var(--text);
        font-family: var(--font-mono);
        font-size: 54px;
        font-weight: 800;
        letter-spacing: 0;
        line-height: 1;
        text-align: center;
      }

      .counter-value--loading {
        color: var(--text-tertiary);
      }

      .counter-btn {
        width: 44px;
        height: 44px;
        border: 1px solid var(--border);
        border-radius: 50%;
        background: var(--bg-soft);
        color: var(--text);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--font-mono);
        font-size: 20px;
        font-weight: 700;
        transition:
          transform var(--transition),
          background var(--transition),
          border-color var(--transition);
      }

      .counter-btn:hover {
        border-color: var(--indigo-border);
        background: var(--indigo-soft);
        transform: translateY(-1px);
      }

      .counter-btn:disabled,
      .user-fetch-btn:disabled,
      .stream-btn:disabled {
        cursor: not-allowed;
        opacity: 0.58;
      }

      .counter-info,
      .stream-meta,
      .stream-error {
        color: var(--text-tertiary);
        font-family: var(--font-mono);
        font-size: 12px;
      }

      .counter-info {
        text-align: center;
      }

      .user-fetch-btn,
      .stream-btn {
        width: 100%;
        min-height: 44px;
        margin-bottom: 18px;
        border-radius: var(--radius);
        cursor: pointer;
        font-size: 14px;
        font-weight: 750;
        transition:
          transform var(--transition),
          color var(--transition),
          background var(--transition),
          border-color var(--transition);
      }

      .user-fetch-btn {
        border: 1px solid var(--teal-border);
        background: var(--teal-soft);
        color: var(--teal);
      }

      .stream-btn {
        border: 1px solid var(--amber-border);
        background: var(--amber-soft);
        color: var(--amber);
      }

      .user-fetch-btn:hover,
      .stream-btn:hover {
        transform: translateY(-1px);
      }

      .user-fetch-btn:hover {
        background: var(--teal);
        color: #06100e;
      }

      .stream-btn:hover {
        background: var(--amber);
        color: #140f05;
      }

      .user-profile {
        min-height: 88px;
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 14px;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--bg-soft);
        animation: fadeIn 260ms ease-out;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(6px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .user-avatar {
        width: 48px;
        height: 48px;
        flex: 0 0 auto;
        border: 1px solid var(--indigo-border);
        border-radius: 50%;
        background: linear-gradient(135deg, var(--indigo), var(--teal));
        color: #08090b;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
        font-weight: 850;
      }

      .user-info {
        min-width: 0;
      }

      .user-name {
        color: var(--text);
        font-size: 15px;
        font-weight: 760;
      }

      .user-meta {
        margin-top: 2px;
        color: var(--text-secondary);
        font-size: 13px;
        overflow-wrap: anywhere;
      }

      .user-role {
        display: inline-flex;
        align-items: center;
        min-height: 22px;
        margin-top: 8px;
        padding: 0 7px;
        border: 1px solid var(--teal-border);
        border-radius: 5px;
        background: var(--teal-soft);
        color: var(--teal);
        font-family: var(--font-mono);
        font-size: 11px;
        font-weight: 800;
      }

      .user-empty {
        min-height: 88px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        border: 1px dashed var(--border);
        border-radius: var(--radius);
        color: var(--text-tertiary);
        font-size: 14px;
        text-align: center;
      }

      .loading-spinner {
        display: inline-block;
        width: 15px;
        height: 15px;
        margin-right: 8px;
        border: 2px solid rgba(66, 212, 184, 0.24);
        border-top-color: currentColor;
        border-radius: 50%;
        vertical-align: -2px;
        animation: spin 0.65s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .stream-output {
        min-height: 118px;
        padding: 18px;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--bg-soft);
        color: var(--text-secondary);
        font-family: var(--font-mono);
        font-size: 14px;
        line-height: 1.75;
        white-space: pre-wrap;
      }

      .stream-caret {
        display: inline-block;
        width: 8px;
        height: 18px;
        margin-left: 2px;
        background: var(--amber);
        vertical-align: text-bottom;
        animation: blink 900ms steps(2, start) infinite;
      }

      @keyframes blink {
        to {
          visibility: hidden;
        }
      }

      .stream-meta,
      .stream-error {
        margin-top: 12px;
      }

      .stream-error {
        color: var(--red);
      }

      .code-block {
        overflow: hidden;
      }

      .code-tabs {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        border-bottom: 1px solid var(--border);
        background: rgba(10, 11, 13, 0.32);
      }

      .code-tab {
        min-width: 0;
        min-height: 64px;
        padding: 12px 16px;
        border: 0;
        border-right: 1px solid var(--border);
        border-bottom: 2px solid transparent;
        background: transparent;
        color: var(--text-tertiary);
        cursor: pointer;
        text-align: left;
        transition:
          color var(--transition),
          background var(--transition),
          border-color var(--transition);
      }

      .code-tab:last-child {
        border-right: 0;
      }

      .code-tab span,
      .code-tab strong {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .code-tab span {
        margin-bottom: 4px;
        font-size: 12px;
        font-weight: 760;
      }

      .code-tab strong {
        color: inherit;
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: 650;
      }

      .code-tab:hover,
      .code-tab--active {
        background: var(--surface-raised);
        color: var(--text);
      }

      .code-tab--active {
        border-bottom-color: var(--indigo);
      }

      .code-content {
        padding: 24px;
      }

      .code-content pre {
        margin: 0;
        color: var(--text-secondary);
        font-family: var(--font-mono);
        font-size: 13.5px;
        line-height: 1.75;
        overflow-x: auto;
      }

      .code-content .kw {
        color: var(--indigo);
      }

      .code-content .fn {
        color: var(--teal);
      }

      .code-content .str {
        color: var(--amber);
      }

      .code-content .cm {
        color: var(--text-tertiary);
      }

      .footer {
        padding-top: 28px;
        padding-bottom: 42px;
        border-top: 1px solid rgba(44, 51, 66, 0.72);
        color: var(--text-tertiary);
        font-size: 14px;
        text-align: center;
      }

      .footer p {
        margin: 0;
      }

      @media (max-width: 920px) {
        .hero {
          grid-template-columns: 1fr;
          gap: 34px;
          padding-top: 64px;
        }

        .section-heading,
        .section--split {
          grid-template-columns: 1fr;
        }

        .capability-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 720px) {
        .nav-inner {
          height: auto;
          padding-top: 14px;
          padding-bottom: 14px;
          align-items: center;
        }

        .hero {
          padding-top: 48px;
        }

        .hero-title {
          font-size: 52px;
        }

        .hero-subtitle {
          font-size: 18px;
        }

        .hero-actions,
        .hero-actions a {
          width: 100%;
        }

        .demo-grid,
        .artifact-grid,
        .flow,
        .code-tabs {
          grid-template-columns: 1fr;
        }

        .flow-arrow {
          width: 100%;
        }

        .section {
          padding-top: 50px;
          padding-bottom: 50px;
        }

        .code-tab {
          border-right: 0;
          border-bottom: 1px solid var(--border);
        }

        .code-tab--active {
          border-bottom-color: var(--indigo);
        }
      }
  `],
};

export default function Layout(
  { children }: { children: React.ReactNode },
): React.ReactElement {
  return <>{children}</>;
}
