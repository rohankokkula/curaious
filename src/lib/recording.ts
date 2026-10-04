import { z } from "zod";

/**
 * Session recordings. A speaker shares a link after their talk; we embed it
 * if it's a provider we recognise and fall back to a plain external link if
 * it isn't.
 *
 * The allowlist is the security boundary, not a convenience: members set this
 * field themselves, and an arbitrary member-supplied URL must never reach an
 * <iframe src>. Anything that doesn't parse here renders as a link.
 */

export const RECORDING_PROVIDERS = ["youtube", "vimeo", "loom"] as const;
export type RecordingProvider = (typeof RECORDING_PROVIDERS)[number];

export interface ParsedRecording {
  provider: RecordingProvider;
  /** Safe to put in an iframe. */
  embedUrl: string;
  /** Canonical page to open in a new tab. */
  watchUrl: string;
}

/** Who can watch recordings: the whole signed-in cohort (each speaker's own
 * "recording" visibility toggle still applies to their talk). Never public. */
export const RECORDINGS_VISIBLE_TO: "admin" | "cohort" = "cohort";

/** Stand-in used to check the card renders before any real recording exists. */
export const SAMPLE_RECORDING_URL = "https://youtu.be/_aw32rFL680";

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const DIGITS = /^\d+$/;
const LOOM_ID = /^[A-Za-z0-9]{8,64}$/;

function youtubeId(parsed: URL): string | null {
  const host = parsed.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1).split("/")[0];
    return YOUTUBE_ID.test(id) ? id : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const watch = parsed.searchParams.get("v");
    if (watch && YOUTUBE_ID.test(watch)) return watch;

    // /embed/ID, /live/ID, /shorts/ID
    const [, segment, id] = parsed.pathname.split("/");
    if (["embed", "live", "shorts"].includes(segment) && id && YOUTUBE_ID.test(id)) return id;
  }

  return null;
}

export function parseRecordingUrl(raw: string | null | undefined): ParsedRecording | null {
  if (!raw) return null;

  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") return null;

  const host = parsed.hostname.replace(/^www\./, "");

  const yt = youtubeId(parsed);
  if (yt) {
    return {
      provider: "youtube",
      // nocookie so an embed on a public page doesn't set advertising cookies
      embedUrl: `https://www.youtube-nocookie.com/embed/${yt}`,
      watchUrl: `https://www.youtube.com/watch?v=${yt}`,
    };
  }

  if (host === "vimeo.com") {
    const id = parsed.pathname.slice(1).split("/")[0];
    if (DIGITS.test(id)) {
      return {
        provider: "vimeo",
        embedUrl: `https://player.vimeo.com/video/${id}`,
        watchUrl: `https://vimeo.com/${id}`,
      };
    }
  }

  if (host === "loom.com") {
    const [, segment, id] = parsed.pathname.split("/");
    if ((segment === "share" || segment === "embed") && id && LOOM_ID.test(id)) {
      return {
        provider: "loom",
        embedUrl: `https://www.loom.com/embed/${id}`,
        watchUrl: `https://www.loom.com/share/${id}`,
      };
    }
  }

  return null;
}

/** Accepts an empty string (clearing the recording) or a parseable link. */
export const recordingUrlSchema = z
  .string()
  .trim()
  .max(300)
  .refine((value) => value === "" || parseRecordingUrl(value) !== null, {
    message: "paste a youtube, vimeo or loom link.",
  });

export const recordingUpdateSchema = z.object({ recordingUrl: recordingUrlSchema });
