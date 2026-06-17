import type { AvatarAssetDefinitionWithTypes } from "src/ts/helpers/requests/services/avatar";
import type { ListedUserInventoryAsset } from "src/ts/helpers/requests/services/inventory";
import { filterWornAssets, getAssetTypeData } from "src/ts/utils/itemTypes";
import { type ItemColor, matchesSeed } from "./colors";
import {
	isColorRelevantType,
	isPoolEligible,
	type RollOptions,
	type SlotKey,
	SLOTS,
	slotOfAssetType,
} from "./slots";

export type BuildRandomOutfitOptions = {
	pool: ListedUserInventoryAsset[];
	current: AvatarAssetDefinitionWithTypes[];
	lockedSlots: ReadonlySet<SlotKey>;
	options: RollOptions;
	// Per-asset dominant colours, used only when options.colorMatch is on.
	colorIndex?: Map<number, ItemColor | null>;
};

type SlotCandidate = { item: ListedUserInventoryAsset; typeId: number };

// Pick `count` distinct random items from `items` (a partial shuffle; count is
// clamped to the array length, and the whole array comes back shuffled).
function pickRandom<T>(items: T[], count: number): T[] {
	const copy = [...items];
	const out: T[] = [];
	const take = Math.min(count, copy.length);
	for (let i = 0; i < take; i++) {
		const index = Math.floor(Math.random() * copy.length);
		out.push(copy.splice(index, 1)[0]!);
	}
	return out;
}

function randomInt(maxInclusive: number): number {
	return Math.floor(Math.random() * (maxInclusive + 1));
}

function toWornAsset(
	item: ListedUserInventoryAsset,
	assetTypeId: number,
): AvatarAssetDefinitionWithTypes {
	return {
		id: item.assetId,
		name: item.name,
		assetType: { id: assetTypeId, name: item.assetType },
	};
}

// Returns true when both sets contain the same asset ids (order-insensitive).
export function isSameAssetSet(
	a: AvatarAssetDefinitionWithTypes[],
	b: AvatarAssetDefinitionWithTypes[],
): boolean {
	if (a.length !== b.length) {
		return false;
	}
	const ids = new Set(a.map((asset) => asset.id));
	return b.every((asset) => ids.has(asset.id));
}

// Is there at least one owned item in an unlocked slot the roulette could use?
export function hasRollableItems(
	pool: ListedUserInventoryAsset[],
	lockedSlots: ReadonlySet<SlotKey>,
	options: RollOptions,
): boolean {
	return pool.some((item) => {
		const typeData = getAssetTypeData(item.assetType);
		if (!typeData) {
			return false;
		}
		const slot = slotOfAssetType(typeData.assetTypeId);
		return slot !== undefined && !lockedSlots.has(slot) && isPoolEligible(typeData, options);
	});
}

// Flatten a slot's owned items into {item, typeId} pairs.
function slotItems(
	assetTypeIds: number[],
	ownedByType: Map<number, ListedUserInventoryAsset[]>,
): SlotCandidate[] {
	const out: SlotCandidate[] = [];
	for (const typeId of assetTypeIds) {
		const owned = ownedByType.get(typeId);
		if (owned) {
			for (const item of owned) {
				out.push({ item, typeId });
			}
		}
	}
	return out;
}

// Restrict to colour-matching candidates when a palette seed is active; fall back
// to all candidates if nothing matches so the slot still fills.
function preferMatching(
	candidates: SlotCandidate[],
	colorIndex: Map<number, ItemColor | null> | undefined,
	seedHue: number | undefined,
): SlotCandidate[] {
	if (seedHue === undefined || !colorIndex) {
		return candidates;
	}
	const matching = candidates.filter(
		({ item, typeId }) =>
			// Colour-ignored types (T-Shirts, heads) are wildcards: never filtered out.
			!isColorRelevantType(typeId) || matchesSeed(colorIndex.get(item.assetId), seedHue),
	);
	return matching.length ? matching : candidates;
}

export function buildRandomOutfit({
	pool,
	current,
	lockedSlots,
	options,
	colorIndex,
}: BuildRandomOutfitOptions): AvatarAssetDefinitionWithTypes[] {
	// Items outside any clothing/accessory slot (body parts, gear, head, etc.) are
	// always preserved as-is — they are out of scope for the roulette.
	const untouched = current.filter(
		(asset) => slotOfAssetType(asset.assetType.id) === undefined,
	);

	// Locked slots keep whatever the user currently wears in them.
	const lockedKept = current.filter((asset) => {
		const slot = slotOfAssetType(asset.assetType.id);
		return slot !== undefined && lockedSlots.has(slot);
	});

	// Group the eligible owned pool by asset type, skipping locked / ineligible slots.
	const ownedByType = new Map<number, ListedUserInventoryAsset[]>();
	for (const item of pool) {
		const typeData = getAssetTypeData(item.assetType);
		if (!typeData) {
			continue;
		}
		const slot = slotOfAssetType(typeData.assetTypeId);
		if (slot === undefined || lockedSlots.has(slot) || !isPoolEligible(typeData, options)) {
			continue;
		}
		const existing = ownedByType.get(typeData.assetTypeId);
		if (existing) {
			existing.push(item);
		} else {
			ownedByType.set(typeData.assetTypeId, [item]);
		}
	}

	// Color match seed (fresh random): a hue from a random eligible owned item that
	// has a known, non-neutral colour. The rest of the roll coordinates around it.
	let seedHue: number | undefined;
	if (options.colorMatch && colorIndex) {
		const hues: number[] = [];
		for (const [typeId, items] of ownedByType) {
			if (!isColorRelevantType(typeId)) {
				continue;
			}
			for (const item of items) {
				const color = colorIndex.get(item.assetId);
				if (color) {
					hues.push(color.hue);
				}
			}
		}
		if (hues.length) {
			seedHue = hues[Math.floor(Math.random() * hues.length)];
		}
	}

	const rolled: AvatarAssetDefinitionWithTypes[] = [];
	const unlockedSlots = SLOTS.filter((slot) => !lockedSlots.has(slot.key));

	// Core slots (top, bottom, hair, face) always roll one item — the complete look.
	for (const slot of unlockedSlots) {
		if (!slot.single) {
			continue;
		}
		const candidates = preferMatching(
			slotItems(slot.assetTypeIds, ownedByType),
			colorIndex,
			seedHue,
		);
		if (candidates.length) {
			const { item, typeId } = pickRandom(candidates, 1)[0]!;
			rolled.push(toWornAsset(item, typeId));
		}
	}

	// Extras (hats + accessories) form one shared pool; a roll adds a random count
	// between Min and Max items, honouring each type's wear cap (hats ≤3, etc.).
	const extraCandidates = preferMatching(
		unlockedSlots
			.filter((slot) => !slot.single)
			.flatMap((slot) => slotItems(slot.assetTypeIds, ownedByType)),
		colorIndex,
		seedHue,
	);
	if (extraCandidates.length) {
		const hi = Math.min(Math.max(0, options.maxExtras), extraCandidates.length);
		const lo = Math.min(Math.max(0, options.minExtras), hi);
		const target = lo + randomInt(hi - lo);
		const usedPerType = new Map<number, number>();
		let added = 0;
		for (const { item, typeId } of pickRandom(extraCandidates, extraCandidates.length)) {
			if (added >= target) {
				break;
			}
			const perTypeLimit = getAssetTypeData(typeId)?.lockedLimit ?? 1;
			if ((usedPerType.get(typeId) ?? 0) >= perTypeLimit) {
				continue;
			}
			rolled.push(toWornAsset(item, typeId));
			usedPerType.set(typeId, (usedPerType.get(typeId) ?? 0) + 1);
			added++;
		}
	}

	// Final legality clamp (one shirt, one pants, <=3 hats, <=5 layered, ...).
	return filterWornAssets([...untouched, ...lockedKept, ...rolled], false).assets;
}
