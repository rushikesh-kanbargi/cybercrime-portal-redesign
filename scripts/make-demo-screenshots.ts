// Generates the placeholder "screenshots" the seeded reports carry as evidence.
//
// Hand-rolled PNGs rather than a dependency or a checked-in binary: it keeps
// opaque image blobs out of the repo, and it means the demo evidence is
// obviously generated rather than lifted from a real person's phone.
//
// Text is drawn with a 5x7 bitmap font defined below, so these read as actual
// chat and bank-statement screenshots rather than coloured rectangles. Every
// line of text in them is invented, and the numbers match the invented
// identifiers the seeded reports carry.
//
// Run indirectly via `npm run db:seed-demo`.

import zlib from "node:zlib";
import crypto from "node:crypto";

type RGB = [number, number, number];

// 5x7 font, one byte per column, low bit = top row. Only the glyphs these
// screenshots actually use are defined; anything else renders as a space.
const FONT: Record<string, number[]> = {
  " ": [0x00, 0x00, 0x00, 0x00, 0x00],
  "!": [0x00, 0x00, 0x5f, 0x00, 0x00],
  "(": [0x00, 0x1c, 0x22, 0x41, 0x00],
  ")": [0x00, 0x41, 0x22, 0x1c, 0x00],
  ",": [0x00, 0x50, 0x30, 0x00, 0x00],
  "-": [0x08, 0x08, 0x08, 0x08, 0x08],
  ".": [0x00, 0x60, 0x60, 0x00, 0x00],
  "/": [0x20, 0x10, 0x08, 0x04, 0x02],
  "0": [0x3e, 0x51, 0x49, 0x45, 0x3e],
  "1": [0x00, 0x42, 0x7f, 0x40, 0x00],
  "2": [0x42, 0x61, 0x51, 0x49, 0x46],
  "3": [0x21, 0x41, 0x45, 0x4b, 0x31],
  "4": [0x18, 0x14, 0x12, 0x7f, 0x10],
  "5": [0x27, 0x45, 0x45, 0x45, 0x39],
  "6": [0x3c, 0x4a, 0x49, 0x49, 0x30],
  "7": [0x01, 0x71, 0x09, 0x05, 0x03],
  "8": [0x36, 0x49, 0x49, 0x49, 0x36],
  "9": [0x06, 0x49, 0x49, 0x29, 0x1e],
  ":": [0x00, 0x36, 0x36, 0x00, 0x00],
  "?": [0x02, 0x01, 0x51, 0x09, 0x06],
  "@": [0x32, 0x49, 0x79, 0x41, 0x3e],
  A: [0x7e, 0x11, 0x11, 0x11, 0x7e],
  B: [0x7f, 0x49, 0x49, 0x49, 0x36],
  C: [0x3e, 0x41, 0x41, 0x41, 0x22],
  D: [0x7f, 0x41, 0x41, 0x22, 0x1c],
  E: [0x7f, 0x49, 0x49, 0x49, 0x41],
  F: [0x7f, 0x09, 0x09, 0x01, 0x01],
  G: [0x3e, 0x41, 0x49, 0x49, 0x7a],
  H: [0x7f, 0x08, 0x08, 0x08, 0x7f],
  I: [0x00, 0x41, 0x7f, 0x41, 0x00],
  J: [0x20, 0x40, 0x41, 0x3f, 0x01],
  K: [0x7f, 0x08, 0x14, 0x22, 0x41],
  L: [0x7f, 0x40, 0x40, 0x40, 0x40],
  M: [0x7f, 0x02, 0x04, 0x02, 0x7f],
  N: [0x7f, 0x04, 0x08, 0x10, 0x7f],
  O: [0x3e, 0x41, 0x41, 0x41, 0x3e],
  P: [0x7f, 0x09, 0x09, 0x09, 0x06],
  Q: [0x3e, 0x41, 0x51, 0x21, 0x5e],
  R: [0x7f, 0x09, 0x19, 0x29, 0x46],
  S: [0x46, 0x49, 0x49, 0x49, 0x31],
  T: [0x01, 0x01, 0x7f, 0x01, 0x01],
  U: [0x3f, 0x40, 0x40, 0x40, 0x3f],
  V: [0x1f, 0x20, 0x40, 0x20, 0x1f],
  W: [0x7f, 0x20, 0x18, 0x20, 0x7f],
  X: [0x63, 0x14, 0x08, 0x14, 0x63],
  Y: [0x03, 0x04, 0x78, 0x04, 0x03],
  Z: [0x61, 0x51, 0x49, 0x45, 0x43],
  a: [0x20, 0x54, 0x54, 0x54, 0x78],
  b: [0x7f, 0x48, 0x44, 0x44, 0x38],
  c: [0x38, 0x44, 0x44, 0x44, 0x20],
  d: [0x38, 0x44, 0x44, 0x48, 0x7f],
  e: [0x38, 0x54, 0x54, 0x54, 0x18],
  f: [0x08, 0x7e, 0x09, 0x01, 0x02],
  g: [0x0c, 0x52, 0x52, 0x52, 0x3e],
  h: [0x7f, 0x08, 0x04, 0x04, 0x78],
  i: [0x00, 0x44, 0x7d, 0x40, 0x00],
  j: [0x20, 0x40, 0x44, 0x3d, 0x00],
  k: [0x7f, 0x10, 0x28, 0x44, 0x00],
  l: [0x00, 0x41, 0x7f, 0x40, 0x00],
  m: [0x7c, 0x04, 0x18, 0x04, 0x78],
  n: [0x7c, 0x08, 0x04, 0x04, 0x78],
  o: [0x38, 0x44, 0x44, 0x44, 0x38],
  p: [0x7c, 0x14, 0x14, 0x14, 0x08],
  q: [0x08, 0x14, 0x14, 0x18, 0x7c],
  r: [0x7c, 0x08, 0x04, 0x04, 0x08],
  s: [0x48, 0x54, 0x54, 0x54, 0x20],
  t: [0x04, 0x3f, 0x44, 0x40, 0x20],
  u: [0x3c, 0x40, 0x40, 0x20, 0x7c],
  v: [0x1c, 0x20, 0x40, 0x20, 0x1c],
  w: [0x3c, 0x40, 0x30, 0x40, 0x3c],
  x: [0x44, 0x28, 0x10, 0x28, 0x44],
  y: [0x0c, 0x50, 0x50, 0x50, 0x3c],
  z: [0x44, 0x64, 0x54, 0x4c, 0x44],
};

const WIDTH = 420;
const HEIGHT = 760;

class Canvas {
  private px: Buffer;

  constructor(
    readonly w: number,
    readonly h: number,
    bg: RGB,
  ) {
    this.px = Buffer.alloc(w * h * 3);
    for (let i = 0; i < w * h; i++) {
      this.px[i * 3] = bg[0];
      this.px[i * 3 + 1] = bg[1];
      this.px[i * 3 + 2] = bg[2];
    }
  }

  rect(x: number, y: number, w: number, h: number, c: RGB) {
    for (let yy = Math.max(0, y); yy < Math.min(this.h, y + h); yy++) {
      for (let xx = Math.max(0, x); xx < Math.min(this.w, x + w); xx++) {
        const p = (yy * this.w + xx) * 3;
        this.px[p] = c[0];
        this.px[p + 1] = c[1];
        this.px[p + 2] = c[2];
      }
    }
  }

  /** Draw one glyph scaled by `s`. */
  private glyph(ch: string, x: number, y: number, c: RGB, s: number) {
    const cols = FONT[ch] ?? FONT[" "];
    for (let col = 0; col < 5; col++) {
      for (let row = 0; row < 7; row++) {
        if (cols[col] & (1 << row)) this.rect(x + col * s, y + row * s, s, s, c);
      }
    }
  }

  text(str: string, x: number, y: number, c: RGB, s = 2) {
    let cx = x;
    for (const ch of str) {
      this.glyph(ch, cx, y, c, s);
      cx += 6 * s;
    }
  }

  /** Word-wrap into a fixed pixel width, returning the height consumed. */
  wrap(str: string, x: number, y: number, maxW: number, c: RGB, s = 2): number {
    const charW = 6 * s;
    const perLine = Math.max(1, Math.floor(maxW / charW));
    const words = str.split(" ");
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      if ((line + (line ? " " : "") + word).length > perLine) {
        if (line) lines.push(line);
        line = word;
      } else {
        line += (line ? " " : "") + word;
      }
    }
    if (line) lines.push(line);
    lines.forEach((l, i) => this.text(l, x, y + i * (9 * s), c, s));
    return lines.length * (9 * s);
  }

  toPng(): Buffer {
    const raw = Buffer.alloc(this.h * (1 + this.w * 3));
    for (let y = 0; y < this.h; y++) {
      raw[y * (1 + this.w * 3)] = 0;
      this.px.copy(raw, y * (1 + this.w * 3) + 1, y * this.w * 3, (y + 1) * this.w * 3);
    }
    return encodePng(this.w, this.h, raw);
  }
}

function crc32(buf: Buffer): number {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width: number, height: number, pixels: Buffer): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(pixels, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const HEADER: RGB = [24, 51, 84];
const WHITE: RGB = [255, 255, 255];
const PAPER: RGB = [237, 233, 226];
const INCOMING: RGB = [255, 255, 255];
const OUTGOING: RGB = [212, 240, 199];
const INK: RGB = [28, 32, 38];
const MUTED: RGB = [122, 130, 140];
const RULE: RGB = [223, 226, 230];
const DANGER: RGB = [176, 42, 42];

export interface ChatLine {
  text: string;
  outgoing?: boolean;
  time: string;
}

/** A messaging-app screenshot: title bar, wrapped bubbles, timestamps. */
export function chatScreenshot(title: string, subtitle: string, lines: ChatLine[]): Buffer {
  const probe = new Canvas(1, 1, PAPER);
  const bubbleW = 300;
  const heights = lines.map((l) => probe.wrap(l.text, 0, 0, bubbleW - 24, INK, 2));
  const contentH = 78 + heights.reduce((a, h) => a + h + 46, 0) + 12;

  const c = new Canvas(WIDTH, Math.min(HEIGHT, contentH), PAPER);
  c.rect(0, 0, WIDTH, 62, HEADER);
  c.text(title, 16, 16, WHITE, 2);
  c.text(subtitle, 16, 38, [178, 196, 216], 1);

  let y = 78;
  lines.forEach((line, i) => {
    const h = heights[i];
    const x = line.outgoing ? WIDTH - bubbleW - 14 : 14;
    c.rect(x, y, bubbleW, h + 34, line.outgoing ? OUTGOING : INCOMING);
    c.wrap(line.text, x + 12, y + 12, bubbleW - 24, INK, 2);
    c.text(line.time, x + bubbleW - 60, y + h + 18, MUTED, 1);
    y += h + 46;
  });
  return c.toPng();
}

export interface StatementRow {
  label: string;
  detail: string;
  amount: string;
  debit?: boolean;
}

/** A bank-statement screenshot: header, ruled rows, amounts on the right. */
export function statementScreenshot(
  title: string,
  subtitle: string,
  rows: StatementRow[],
): Buffer {
  const c = new Canvas(WIDTH, Math.min(HEIGHT, 96 + rows.length * 52 + 16), WHITE);
  c.rect(0, 0, WIDTH, 74, HEADER);
  c.text(title, 16, 18, WHITE, 2);
  c.text(subtitle, 16, 46, [178, 196, 216], 1);

  let y = 96;
  for (const row of rows) {
    c.text(row.label, 16, y, INK, 2);
    c.text(row.detail, 16, y + 22, MUTED, 1);
    c.text(row.amount, WIDTH - 16 - row.amount.length * 12, y, row.debit ? DANGER : INK, 2);
    y += 52;
    c.rect(16, y - 12, WIDTH - 32, 1, RULE);
  }
  return c.toPng();
}

export function sha256(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}
