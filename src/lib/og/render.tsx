/**
 * SERVER-ONLY. Draws curaious share cards (1200×630) with next/og.
 *
 * One layout for every page so a shared link always reads as curaious: the
 * landing page's near-black, the serif wordmark with "ai" underlined, a mono
 * kicker, a big title, and a piece of artwork on the right that says which
 * part of the app this is. Fonts are vendored (src/lib/og/fonts) rather than
 * fetched, so a build or a cold function never depends on a font CDN.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { OgMotif, OgPage } from "@/lib/og/pages";

export const OG_SIZE = { width: 1200, height: 630 };

const BG = "#050506";
const FG = "#f2f2f4";
const MUTED = "#8c8c96";
const LINE = "#23232b";
const CARD = "#0e0e13";

const FONT_DIR = join(process.cwd(), "src/lib/og/fonts");

async function readFonts() {
  const [regular, semibold, bold, mono, serif] = await Promise.all([
    readFile(join(FONT_DIR, "Inter-Regular.woff")),
    readFile(join(FONT_DIR, "Inter-SemiBold.woff")),
    readFile(join(FONT_DIR, "Inter-Bold.woff")),
    readFile(join(FONT_DIR, "IBMPlexMono-Medium.woff")),
    readFile(join(FONT_DIR, "Gelasio-Regular.woff")),
  ]);
  return [
    { name: "Inter", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Inter", data: semibold, weight: 600 as const, style: "normal" as const },
    { name: "Inter", data: bold, weight: 700 as const, style: "normal" as const },
    { name: "Plex Mono", data: mono, weight: 500 as const, style: "normal" as const },
    { name: "Serif", data: serif, weight: 400 as const, style: "normal" as const },
  ];
}

let fontsPromise: ReturnType<typeof readFonts> | null = null;
const loadFonts = () => (fontsPromise ??= readFonts());

/** #rrggbb + alpha → rgba() */
function tint(hex: string, alpha: number) {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/* ───────────────────────── wordmark ───────────────────────── */

export function Wordmark({ size = 34, color = FG }: { size?: number; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", fontFamily: "Serif", fontSize: size, color, letterSpacing: "0.02em", lineHeight: 1 }}>
      <span>cur</span>
      {/* the line sits on the baseline, not below the line box's descender space */}
      <div style={{ display: "flex", position: "relative" }}>
        ai
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: Math.round(size * 0.09),
            height: Math.max(2, Math.round(size / 14)),
            background: "#e08a5a",
          }}
        />
      </div>
      <span>ous</span>
    </div>
  );
}

/* ───────────────────────── artwork ───────────────────────── */

const PALETTE = ["#a78bfa", "#22d3ee", "#fb7185", "#34d399", "#818cf8", "#f0abfc", "#fbbf24", "#5eead4"];

/** Ten seats in an arc, one lit: the speaker. The landing page's hero, in miniature. */
function Seats({ accent }: { accent: string }) {
  const seats = Array.from({ length: 10 }, (_, i) => {
    const t = i / 9;
    const angle = Math.PI * (1.08 - t * 1.16);
    return { x: 210 + 185 * Math.cos(angle), y: 250 - 150 * Math.sin(angle) };
  });
  return (
    <div style={{ display: "flex", position: "relative", width: 420, height: 380 }}>
      {/* stage */}
      <div
        style={{
          position: "absolute",
          left: 150,
          top: 230,
          width: 120,
          height: 120,
          borderRadius: 999,
          background: `radial-gradient(circle, ${tint(accent, 0.55)} 0%, ${tint(accent, 0)} 70%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 186,
          top: 266,
          width: 48,
          height: 48,
          borderRadius: 999,
          background: accent,
          border: `4px solid ${tint("#ffffff", 0.85)}`,
        }}
      />
      {seats.map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: s.x - 22,
            top: s.y - 22,
            width: 44,
            height: 44,
            borderRadius: 999,
            background: tint(PALETTE[i % PALETTE.length], 0.22),
            border: `2px solid ${tint(PALETTE[i % PALETTE.length], 0.7)}`,
          }}
        />
      ))}
    </div>
  );
}

/** Four weeks, two days each, as little colored day cards with two slots. */
function Schedule() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, width: 420 }}>
      {[0, 1, 2, 3].map((w) => (
        <div key={w} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", fontFamily: "Plex Mono", fontSize: 15, color: MUTED, width: 46 }}>W{w + 1}</div>
          {[0, 1].map((d) => {
            const c = w === 0 || w === 3 ? "#a1a1aa" : PALETTE[(w * 2 + d) % PALETTE.length];
            return (
              <div
                key={d}
                style={{
                  display: "flex",
                  flex: 1,
                  gap: 8,
                  padding: 10,
                  borderRadius: 14,
                  background: tint(c, 0.14),
                  border: `1.5px solid ${tint(c, 0.45)}`,
                }}
              >
                {[0, 1].map((s) => (
                  <div
                    key={s}
                    style={{
                      display: "flex",
                      flex: 1,
                      height: 38,
                      borderRadius: 8,
                      border: `1.5px dashed ${tint(c, 0.55)}`,
                      background: s === 0 && w === 1 && d === 0 ? tint(c, 0.5) : "transparent",
                    }}
                  />
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** A small stack of 16:9 slides, the front one with a title and bars. */
function Slides({ accent }: { accent: string }) {
  return (
    <div style={{ display: "flex", position: "relative", width: 420, height: 330 }}>
      {[2, 1].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 40 + i * 26,
            top: 30 - i * 24,
            width: 330,
            height: 186,
            borderRadius: 16,
            background: CARD,
            border: `1.5px solid ${LINE}`,
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          left: 20,
          top: 70,
          width: 360,
          height: 203,
          borderRadius: 16,
          background: "#111117",
          border: `2px solid ${tint(accent, 0.6)}`,
          display: "flex",
          flexDirection: "column",
          padding: 24,
          gap: 12,
        }}
      >
        <div style={{ display: "flex", width: 150, height: 14, borderRadius: 7, background: FG }} />
        <div style={{ display: "flex", width: 110, height: 14, borderRadius: 7, background: tint(FG, 0.5) }} />
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginTop: 18 }}>
          {[38, 62, 48, 84, 70].map((h, i) => (
            <div key={i} style={{ display: "flex", width: 34, height: h, borderRadius: 6, background: i === 3 ? accent : tint(accent, 0.3) }} />
          ))}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 168,
          top: 296,
          display: "flex",
          fontFamily: "Plex Mono",
          fontSize: 15,
          color: MUTED,
          letterSpacing: "0.12em",
        }}
      >
        01 / 12
      </div>
    </div>
  );
}

/** A medal: sunburst rim, dark enamel, a star, ribbon tails. */
function Medal({ accent }: { accent: string }) {
  const cx = 150;
  const cy = 130;
  const pts: string[] = [];
  for (let i = 0; i < 28; i += 1) {
    const r = i % 2 === 0 ? 118 : 102;
    const a = (Math.PI * i) / 14 - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  const star: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? 40 : 17;
    const a = (Math.PI * i) / 5 - Math.PI / 2;
    star.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return (
    <div style={{ display: "flex", width: 420, height: 400, justifyContent: "center" }}>
      <svg width="300" height="380" viewBox="0 0 300 380">
        <defs>
          <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fde68a" />
            <stop offset="0.55" stopColor="#b45309" />
            <stop offset="1" stopColor="#fde68a" />
          </linearGradient>
        </defs>
        <path d="M100,200 L72,360 L106,336 L132,370 L150,220 Z" fill="#991b1b" />
        <path d="M200,200 L228,360 L194,336 L168,370 L150,220 Z" fill="#b91c1c" />
        <polygon points={pts.join(" ")} fill="url(#rim)" />
        <circle cx={cx} cy={cy} r="78" fill="#1c1205" />
        <circle cx={cx} cy={cy} r="78" fill="none" stroke={accent} strokeOpacity="0.6" strokeWidth="3" />
        <circle cx={cx} cy={cy} r="66" fill="none" stroke={accent} strokeOpacity="0.25" strokeWidth="2" strokeDasharray="4 6" />
        <polygon points={star.join(" ")} fill={accent} />
      </svg>
    </div>
  );
}

/** Three overlapping reading cards: a link, a paper, a post. */
function Pages({ accent }: { accent: string }) {
  const cards = [
    { x: 30, y: 60, r: -7, c: PALETTE[1] },
    { x: 120, y: 40, r: 5, c: PALETTE[3] },
    { x: 70, y: 110, r: -1, c: accent },
  ];
  return (
    <div style={{ display: "flex", position: "relative", width: 420, height: 400 }}>
      {cards.map((card, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: card.x,
            top: card.y,
            width: 260,
            height: 250,
            borderRadius: 18,
            background: "#111117",
            border: `2px solid ${tint(card.c, i === 2 ? 0.7 : 0.35)}`,
            transform: `rotate(${card.r}deg)`,
            display: "flex",
            flexDirection: "column",
            padding: 20,
            gap: 12,
          }}
        >
          <div style={{ display: "flex", height: 92, borderRadius: 10, background: tint(card.c, 0.22) }} />
          <div style={{ display: "flex", width: 170, height: 12, borderRadius: 6, background: tint(FG, 0.85) }} />
          <div style={{ display: "flex", width: 200, height: 10, borderRadius: 5, background: tint(FG, 0.28) }} />
          <div style={{ display: "flex", width: 140, height: 10, borderRadius: 5, background: tint(FG, 0.28) }} />
        </div>
      ))}
    </div>
  );
}

/** A profile card silhouette: avatar, name bars, three stats. */
function Profile({ accent }: { accent: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 360,
        padding: 30,
        gap: 22,
        borderRadius: 24,
        background: "#111117",
        border: `2px solid ${tint(accent, 0.5)}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ display: "flex", width: 92, height: 92, borderRadius: 999, background: tint(accent, 0.3), border: `4px solid ${tint(accent, 0.8)}` }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", width: 150, height: 16, borderRadius: 8, background: FG }} />
          <div style={{ display: "flex", width: 110, height: 12, borderRadius: 6, background: tint(FG, 0.35) }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", flex: 1, gap: 8, padding: 14, borderRadius: 12, background: CARD, border: `1.5px solid ${LINE}` }}>
            <div style={{ display: "flex", width: 40, height: 16, borderRadius: 6, background: i === 1 ? accent : tint(FG, 0.8) }} />
            <div style={{ display: "flex", width: 56, height: 8, borderRadius: 4, background: tint(FG, 0.25) }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** An invite card with a keyhole: members only. */
function Lock({ accent }: { accent: string }) {
  return (
    <div style={{ display: "flex", width: 420, height: 380, alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          width: 260,
          height: 320,
          borderRadius: 28,
          background: "#111117",
          border: `2px solid ${tint(accent, 0.55)}`,
        }}
      >
        <div style={{ display: "flex", width: 84, height: 70, borderRadius: "42px 42px 0 0", border: `12px solid ${accent}`, borderBottom: "none" }} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: -18,
            width: 128,
            height: 100,
            borderRadius: 18,
            background: accent,
            paddingTop: 26,
          }}
        >
          <div style={{ display: "flex", width: 22, height: 22, borderRadius: 999, background: "#111117" }} />
          <div style={{ display: "flex", width: 10, height: 24, marginTop: -4, borderRadius: 4, background: "#111117" }} />
        </div>
        <div style={{ display: "flex", fontFamily: "Plex Mono", fontSize: 15, color: MUTED, letterSpacing: "0.18em" }}>INVITE ONLY</div>
      </div>
    </div>
  );
}

function Motif({ motif, accent }: { motif: OgMotif; accent: string }) {
  switch (motif) {
    case "seats":
      return <Seats accent={accent} />;
    case "schedule":
      return <Schedule />;
    case "slides":
      return <Slides accent={accent} />;
    case "medal":
      return <Medal accent={accent} />;
    case "pages":
      return <Pages accent={accent} />;
    case "profile":
      return <Profile accent={accent} />;
    case "lock":
      return <Lock accent={accent} />;
  }
}

/* ───────────────────────── frame ───────────────────────── */

function Frame({
  accent,
  kicker,
  title,
  description,
  footer,
  right,
}: {
  accent: string;
  kicker: string;
  title: string;
  description?: string | null;
  footer?: React.ReactNode;
  right?: React.ReactNode;
}) {
  // Long titles step down so they always fit three lines.
  const titleSize = title.length > 60 ? 50 : title.length > 36 ? 58 : 68;
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: BG,
        backgroundImage: `radial-gradient(circle at 88% 12%, ${tint(accent, 0.28)} 0%, ${tint(accent, 0)} 42%), radial-gradient(circle at 0% 100%, ${tint(accent, 0.1)} 0%, ${tint(accent, 0)} 38%)`,
        color: FG,
        fontFamily: "Inter",
        padding: "64px 72px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <Wordmark />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", paddingRight: right ? 32 : 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontFamily: "Plex Mono",
              fontSize: 18,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: accent,
            }}
          >
            <div style={{ display: "flex", width: 28, height: 2, background: accent }} />
            {kicker}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 22,
              fontSize: titleSize,
              fontWeight: 700,
              lineHeight: 1.06,
              letterSpacing: "-0.03em",
            }}
          >
            {title}
          </div>
          {description ? (
            <div style={{ display: "flex", marginTop: 22, fontSize: 25, lineHeight: 1.4, color: MUTED, maxWidth: 600 }}>
              {description.length > 130 ? `${description.slice(0, 127).trimEnd()}…` : description}
            </div>
          ) : null}
        </div>
        {footer ?? null}
      </div>
      {right ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 420 }}>{right}</div> : null}
    </div>
  );
}

export async function renderOgPage(page: OgPage) {
  return new ImageResponse(
    (
      <Frame
        accent={page.accent}
        kicker={page.kicker}
        title={page.title}
        description={page.description}
        right={<Motif motif={page.motif} accent={page.accent} />}
      />
    ),
    { ...OG_SIZE, fonts: await loadFonts() },
  );
}

export async function renderOgArticle(article: {
  title: string;
  excerpt: string | null;
  authorName: string | null;
  authorAvatarUrl: string | null;
  readMinutes: number | null;
  tags: string[];
}) {
  const accent = "#c084fc";
  const initials = (article.authorName ?? "?")
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const footer = (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      {article.authorAvatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- next/og renders a real <img>
        <img src={article.authorAvatarUrl} alt="" width={56} height={56} style={{ borderRadius: 999, objectFit: "cover" }} />
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 56,
            height: 56,
            borderRadius: 999,
            background: tint(accent, 0.25),
            color: accent,
            fontSize: 20,
            fontWeight: 600,
          }}
        >
          {initials}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 24, fontWeight: 600 }}>{article.authorName ?? "A curaious member"}</div>
        <div style={{ display: "flex", fontSize: 19, color: MUTED }}>
          {[article.readMinutes ? `${article.readMinutes} min read` : null, ...article.tags.slice(0, 2).map((t) => `#${t}`)]
            .filter(Boolean)
            .join("  ·  ")}
        </div>
      </div>
    </div>
  );

  return new ImageResponse(
    <Frame accent={accent} kicker="written by the cohort" title={article.title} description={article.excerpt} footer={footer} />,
    { ...OG_SIZE, fonts: await loadFonts() },
  );
}

/** The "ai", underlined: favicon and home-screen icon. `rounded` is off for
 * the iOS icon, which the system masks into its own rounded square. */
export function renderMarkIcon(size: number, { rounded = true }: { rounded?: boolean } = {}) {
  return loadFonts().then(
    (fonts) =>
      new ImageResponse(
        (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              background: BG,
              borderRadius: rounded ? Math.round(size * 0.22) : 0,
            }}
          >
            <div style={{ display: "flex", fontFamily: "Serif", fontSize: Math.round(size * 0.74), color: FG, lineHeight: 0.78 }}>
              ai
            </div>
            <div
              style={{
                display: "flex",
                width: Math.round(size * 0.56),
                height: Math.max(2, Math.round(size * 0.09)),
                marginTop: Math.round(size * 0.07),
                background: "#e08a5a",
                borderRadius: 2,
              }}
            />
          </div>
        ),
        { width: size, height: size, fonts },
      ),
  );
}
