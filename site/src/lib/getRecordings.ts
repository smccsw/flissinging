import { createClient, type SanityClient } from "@sanity/client";
import type { Recording } from "../data/recordings";
import { fallbackRecordings } from "../data/recordings";

type SanityRecordingRow = {
  id: string;
  title: string;
  subtitle?: string;
  playbackGain?: number;
  licenseLabel?: string;
  licenseUrl?: string;
  sourceUrl?: string;
  audioUrl?: string;
};

const RECORDINGS_QUERY = `*[_type == "recording" && (defined(audioFile.asset) || defined(externalAudioUrl))] | order(coalesce(order, 999) asc, _createdAt asc) {
  "id": coalesce(slug.current, _id),
  title,
  subtitle,
  playbackGain,
  licenseLabel,
  licenseUrl,
  sourceUrl,
  "audioUrl": coalesce(audioFile.asset->url, externalAudioUrl)
}`;

function projectIdFromEnv(): string | undefined {
  const fromMeta = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
  if (fromMeta) return fromMeta;
  if (typeof process !== "undefined" && process.env.PUBLIC_SANITY_PROJECT_ID) {
    return process.env.PUBLIC_SANITY_PROJECT_ID;
  }
  return undefined;
}

function readToken(): string | undefined {
  if (typeof process !== "undefined" && process.env.SANITY_READ_TOKEN) {
    return process.env.SANITY_READ_TOKEN;
  }
  return import.meta.env.SANITY_READ_TOKEN;
}

function buildClient(): SanityClient | null {
  const projectId = projectIdFromEnv();
  if (!projectId) return null;
  const dataset =
    import.meta.env.PUBLIC_SANITY_DATASET ||
    (typeof process !== "undefined" ? process.env.PUBLIC_SANITY_DATASET : undefined) ||
    "production";
  return createClient({
    projectId,
    dataset,
    useCdn: true,
    apiVersion: "2025-04-17",
    token: readToken()
  });
}

function rowToRecording(row: SanityRecordingRow): Recording | null {
  if (!row.title || !row.audioUrl) return null;
  return {
    id: row.id || row.title.toLowerCase().replace(/\s+/g, "-"),
    title: row.title,
    subtitle: row.subtitle,
    src: row.audioUrl,
    licenseLabel: row.licenseLabel || "All rights reserved",
    licenseUrl: row.licenseUrl || "#",
    sourceUrl: row.sourceUrl || "#",
    playbackGain: row.playbackGain
  };
}

/**
 * Load recordings from Sanity at build time. Falls back to bundled demos when CMS is unset or empty.
 */
export async function getRecordings(): Promise<Recording[]> {
  const client = buildClient();
  if (!client) return fallbackRecordings;

  try {
    const rows = await client.fetch<SanityRecordingRow[]>(RECORDINGS_QUERY);
    if (!Array.isArray(rows) || rows.length === 0) return fallbackRecordings;
    const mapped = rows.map(rowToRecording).filter((r): r is Recording => r !== null);
    return mapped.length > 0 ? mapped : fallbackRecordings;
  } catch {
    return fallbackRecordings;
  }
}
