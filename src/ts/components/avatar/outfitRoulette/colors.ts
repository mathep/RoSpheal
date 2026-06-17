import { getColorSync } from "colorthief";
import { thumbnailProcessor } from "src/ts/helpers/processors/thumbnailProcessor";
import { sleep } from "src/ts/utils/misc";
import tinycolor from "tinycolor2";

const STORAGE_KEY = "avatarOutfitRouletteColors";
// Kept deliberately low + paced: this is a background trickle that must not
// contend with the avatar editor's own (rate-limited) requests.
const CONCURRENCY = 3;
const PACING_MS = 80;
const IMAGE_TIMEOUT_MS = 10_000;
// Ignore washed-out / near-grey pixels so we read the item's real colour, not its
// neutral thumbnail background.
const MIN_SATURATION = 0.12;
const PERSIST_EVERY = 40;

// Two items whose dominant hues are within this many degrees count as a match
// (an "analogous" palette). Exported so the window is easy to tune.
export const ANALOGOUS_TOLERANCE = 40;

export type ItemColor = { hue: number };

// assetId -> dominant colour. `null` = analysed but no usable colour (neutral /
// greyscale / failed) → treated as a wildcard that matches any palette.
const colorIndex = new Map<number, ItemColor | null>();
// Mirror of colorIndex as persisted hex (or null), written back to storage.local.
const hexCache: Record<number, string | null> = {};

let loadPromise: Promise<void> | undefined;

export function getColorIndex(): Map<number, ItemColor | null> {
	return colorIndex;
}

function hueFromHex(hex: string): number {
	return tinycolor(hex).toHsl().h;
}

// Load the persisted colour map once. Survives browser restarts (storage.local),
// so each item is only ever analysed a single time across sessions.
export function loadColorCache(): Promise<void> {
	if (!loadPromise) {
		loadPromise = (async () => {
			try {
				const stored = await browser.storage.local.get(STORAGE_KEY);
				const map = (stored?.[STORAGE_KEY] ?? {}) as Record<string, string | null>;
				for (const key in map) {
					const id = Number(key);
					const hex = map[key] ?? null;
					hexCache[id] = hex;
					colorIndex.set(id, hex ? { hue: hueFromHex(hex) } : null);
				}
			} catch {
				// Start from an empty cache if storage is unavailable.
			}
		})();
	}
	return loadPromise;
}

function persist(): Promise<void> {
	return browser.storage.local.set({ [STORAGE_KEY]: hexCache }).catch(() => {});
}

function loadImage(url: string, signal?: AbortSignal): Promise<HTMLImageElement | null> {
	return new Promise((resolve) => {
		const img = new Image();
		// Must be set before `src` for the CORS-clean canvas read colorthief does.
		img.crossOrigin = "anonymous";

		let settled = false;
		const finish = (value: HTMLImageElement | null) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			img.onload = null;
			img.onerror = null;
			resolve(value);
		};

		const timer = setTimeout(() => finish(null), IMAGE_TIMEOUT_MS);
		img.onload = () => finish(img);
		img.onerror = () => finish(null);
		signal?.addEventListener("abort", () => finish(null), { once: true });
		img.src = url;
	});
}

async function analyzeAsset(assetId: number, signal?: AbortSignal): Promise<void> {
	if (colorIndex.has(assetId)) return;

	let hex: string | null = null;
	try {
		const thumbnail = await thumbnailProcessor.request({
			targetId: assetId,
			type: "Asset",
			size: "150x150",
			format: "Webp",
		});
		if (thumbnail?.imageUrl && !signal?.aborted) {
			const img = await loadImage(thumbnail.imageUrl, signal);
			if (img) {
				const color = getColorSync(img, {
					ignoreWhite: true,
					minSaturation: MIN_SATURATION,
					quality: 5,
				});
				hex = color ? color.hex() : null;
			}
		}
	} catch {
		hex = null;
	}

	if (signal?.aborted) return;
	hexCache[assetId] = hex;
	colorIndex.set(assetId, hex ? { hue: hueFromHex(hex) } : null);
}

export type AnalyzeProgress = { done: number; total: number };

// Analyse every not-yet-cached asset with bounded concurrency, persisting in
// batches. Abortable; safe to call repeatedly (already-cached ids are skipped).
export async function analyzeWardrobe(
	assetIds: number[],
	{
		onProgress,
		signal,
	}: { onProgress?: (progress: AnalyzeProgress) => void; signal?: AbortSignal } = {},
): Promise<void> {
	await loadColorCache();

	const todo = assetIds.filter((id) => !colorIndex.has(id));
	const total = todo.length;
	onProgress?.({ done: 0, total });
	if (!total) return;

	let done = 0;
	let sincePersist = 0;
	let cursor = 0;

	const worker = async () => {
		while (cursor < todo.length && !signal?.aborted) {
			const id = todo[cursor++]!;
			await analyzeAsset(id, signal);
			done++;
			sincePersist++;
			if (sincePersist >= PERSIST_EVERY) {
				sincePersist = 0;
				await persist();
			}
			onProgress?.({ done, total });
			// Trickle, don't burst — yield between items.
			if (!signal?.aborted) {
				await sleep(PACING_MS);
			}
		}
	};

	await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker));
	await persist();
}

function hueDistance(a: number, b: number): number {
	const d = Math.abs(a - b) % 360;
	return d > 180 ? 360 - d : d;
}

// A `null`/unknown colour is a wildcard (neutral / not-yet-analysed) and always
// matches; otherwise the hue must sit within the analogous window of the seed.
export function matchesSeed(color: ItemColor | null | undefined, seedHue: number): boolean {
	if (!color) return true;
	return hueDistance(color.hue, seedHue) <= ANALOGOUS_TOLERANCE;
}
