/**
 * Minimal interactive terminal UI (raw-mode prompts).
 * Arrow keys / Tab to navigate, Enter to confirm.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

function write(s: string) {
  Deno.stdout.writeSync(enc.encode(s));
}

// ── ANSI helpers ────────────────────────────────────────

const ESC = "\x1b";
const CSI = `${ESC}[`;

const ansi = {
  bold: (s: string) => `${CSI}1m${s}${CSI}0m`,
  dim: (s: string) => `${CSI}90m${s}${CSI}0m`,
  cyan: (s: string) => `${CSI}36m${s}${CSI}0m`,
  green: (s: string) => `${CSI}32m${s}${CSI}0m`,
  inverse: (s: string) => `${CSI}7m${s}${CSI}0m`,
  reset: `${CSI}0m`,
  clearLine: `${CSI}2K\r`,
  cursorUp: (n = 1) => `${CSI}${n}A`,
  hideCursor: `${CSI}?25l`,
  showCursor: `${CSI}?25h`,
};

const S = {
  pointer: ansi.cyan("\u276f"),       // ❯
  radio:   ansi.cyan("\u25c9"),       // ◉
  dot:     ansi.dim("\u25cb"),        // ○
  check:   ansi.green("\u2714"),      // ✔
  bar:     ansi.dim("\u2502"),        // │
  corner:  ansi.dim("\u2514"),        // └
  top:     ansi.green("\u25c6"),      // ◆
  topDone: ansi.green("\u25c7"),      // ◇
};

// ── Raw-mode key reader ─────────────────────────────────

async function readKey(): Promise<string> {
  const buf = new Uint8Array(8);
  const n = await Deno.stdin.read(buf);
  if (n === null) return "";
  return dec.decode(buf.subarray(0, n));
}

const isTTY = Deno.stdin.isTerminal();

// ── Select prompt ───────────────────────────────────────

export async function selectPrompt<T extends string>(
  label: string,
  options: readonly T[],
  defaultIdx = 0,
): Promise<T> {
  if (!isTTY) {
    // Non-interactive: use default
    write(`  ${S.topDone}  ${ansi.bold(label)} ${ansi.dim("·")} ${options[defaultIdx]}\n`);
    return options[defaultIdx];
  }
  let idx = defaultIdx;

  function render(final = false) {
    // Line 1: label
    write(ansi.clearLine);
    if (final) {
      write(`  ${S.topDone}  ${ansi.bold(label)} ${ansi.dim("·")} ${ansi.cyan(options[idx])}\n`);
      return;
    }
    write(`  ${S.top}  ${ansi.bold(label)}\n`);

    // Line 2: options
    write(ansi.clearLine);
    const items = options.map((o, i) => {
      const marker = i === idx ? S.radio : S.dot;
      const text = i === idx ? ansi.bold(o) : ansi.dim(o);
      return `${marker} ${text}`;
    });
    write(`  ${S.bar}  ${items.join("   ")}\n`);
  }

  // Initial render
  write(ansi.hideCursor);
  render();

  Deno.stdin.setRaw(true);
  try {
    while (true) {
      const key = await readKey();

      if (key === "\x03") {
        // Ctrl+C
        write(ansi.showCursor);
        Deno.stdin.setRaw(false);
        Deno.exit(130);
      }

      if (key === "\r" || key === "\n") {
        // Confirm
        break;
      }

      if (key === "\t" || key === `${ESC}[C`) {
        // Tab or Right arrow → next
        idx = (idx + 1) % options.length;
      } else if (key === `${ESC}[D`) {
        // Left arrow → prev
        idx = (idx - 1 + options.length) % options.length;
      }

      // Redraw (move cursor up 2 lines, then re-render)
      write(ansi.cursorUp(2));
      render();
    }
  } finally {
    Deno.stdin.setRaw(false);
  }

  // Final state: collapse to single line
  write(ansi.cursorUp(2));
  render(true);
  write(ansi.showCursor);

  return options[idx];
}

// ── Text prompt ─────────────────────────────────────────

export async function textPrompt(
  label: string,
  defaultValue: string,
): Promise<string> {
  if (!isTTY) {
    write(`  ${S.topDone}  ${ansi.bold(label)} ${ansi.dim("·")} ${defaultValue}\n`);
    return defaultValue;
  }

  let value = "";
  let submitted = false;

  function render(final = false) {
    write(ansi.clearLine);
    if (final) {
      const display = value || defaultValue;
      write(`  ${S.topDone}  ${ansi.bold(label)} ${ansi.dim("·")} ${ansi.cyan(display)}\n`);
      return;
    }
    write(`  ${S.top}  ${ansi.bold(label)}\n`);
    write(ansi.clearLine);
    if (value) {
      write(`  ${S.bar}  ${value}\n`);
    } else {
      write(`  ${S.bar}  ${ansi.dim(defaultValue)}\n`);
    }
  }

  write(ansi.hideCursor);
  render();

  Deno.stdin.setRaw(true);
  try {
    while (!submitted) {
      const key = await readKey();

      if (key === "\x03") {
        write(ansi.showCursor);
        Deno.stdin.setRaw(false);
        Deno.exit(130);
      }

      if (key === "\r" || key === "\n") {
        submitted = true;
        break;
      }

      if (key === "\x7f" || key === "\x08") {
        // Backspace
        value = value.slice(0, -1);
      } else if (key.length === 1 && key >= " ") {
        // Printable character
        value += key;
      }

      write(ansi.cursorUp(2));
      render();
    }
  } finally {
    Deno.stdin.setRaw(false);
  }

  write(ansi.cursorUp(2));
  render(true);
  write(ansi.showCursor);

  return value || defaultValue;
}

// ── Intro / Outro ───────────────────────────────────────

export function intro(title: string) {
  write(`\n  ${ansi.bold(ansi.cyan(title))}\n\n`);
}

export function outro(msg: string) {
  write(`\n  ${S.corner}  ${ansi.dim(msg)}\n\n`);
}

export function step(msg: string) {
  write(`  ${ansi.dim(msg)}\n`);
}
