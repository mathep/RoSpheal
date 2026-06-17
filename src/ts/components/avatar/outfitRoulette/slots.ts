import type { AssetTypeData } from "src/ts/utils/itemTypes";

// Asset type ids (see src/ts/utils/itemTypes.ts).
const TSHIRT = 2;
const HAT = 8;
const SHIRT = 11;
const PANTS = 12;
const HEAD = 17;
const FACE = 18;
const DYNAMIC_HEAD = 79;
const HAIR_ACCESSORY = 41;
const FACE_ACCESSORY = 42;
const NECK_ACCESSORY = 43;
const SHOULDER_ACCESSORY = 44;
const FRONT_ACCESSORY = 45;
const BACK_ACCESSORY = 46;
const WAIST_ACCESSORY = 47;
// Layered (3D) clothing — only eligible when Blocky mode is off.
const TSHIRT_ACCESSORY = 64;
const SHIRT_ACCESSORY = 65;
const PANTS_ACCESSORY = 66;
const JACKET_ACCESSORY = 67;
const SWEATER_ACCESSORY = 68;
const SHORTS_ACCESSORY = 69;
const DRESS_SKIRT_ACCESSORY = 72;

export type SlotKey =
	| "top"
	| "bottom"
	| "hair"
	| "face"
	| "hat"
	| "glasses"
	| "neck"
	| "shoulders"
	| "front"
	| "back"
	| "waist";

export type SlotDef = {
	key: SlotKey;
	assetTypeIds: number[];
	// When true, a re-roll always picks exactly one item for the whole slot (the
	// core look). When false, the slot's items join the shared "extras" pool that
	// is bounded by the Min/Max items setting (hats / accessories).
	single: boolean;
};

// Ordered list of the slot categories the roulette touches. Anything NOT covered
// here (body parts, gear, heads, dynamic heads, animations, makeup) is never
// randomized — that is what keeps the feature "clothing & accessories only".
export const SLOTS: SlotDef[] = [
	// Core look — each rolls exactly one item.
	{
		key: "top",
		assetTypeIds: [
			SHIRT,
			TSHIRT,
			TSHIRT_ACCESSORY,
			SHIRT_ACCESSORY,
			JACKET_ACCESSORY,
			SWEATER_ACCESSORY,
		],
		single: true,
	},
	{
		key: "bottom",
		assetTypeIds: [PANTS, PANTS_ACCESSORY, SHORTS_ACCESSORY, DRESS_SKIRT_ACCESSORY],
		single: true,
	},
	{ key: "hair", assetTypeIds: [HAIR_ACCESSORY], single: true },
	{ key: "face", assetTypeIds: [FACE], single: true },
	// Accessories — one lock per Roblox accessory type. All share the Min/Max
	// "extra items" budget; per-type wear caps still apply (hats ≤3, others ≤1).
	{ key: "hat", assetTypeIds: [HAT], single: false },
	{ key: "glasses", assetTypeIds: [FACE_ACCESSORY], single: false },
	{ key: "neck", assetTypeIds: [NECK_ACCESSORY], single: false },
	{ key: "shoulders", assetTypeIds: [SHOULDER_ACCESSORY], single: false },
	{ key: "front", assetTypeIds: [FRONT_ACCESSORY], single: false },
	{ key: "back", assetTypeIds: [BACK_ACCESSORY], single: false },
	{ key: "waist", assetTypeIds: [WAIST_ACCESSORY], single: false },
];

const TYPE_TO_SLOT = new Map<number, SlotKey>();
for (const slot of SLOTS) {
	for (const assetTypeId of slot.assetTypeIds) {
		TYPE_TO_SLOT.set(assetTypeId, slot.key);
	}
}

export function slotOfAssetType(assetTypeId: number): SlotKey | undefined {
	return TYPE_TO_SLOT.get(assetTypeId);
}

export type RollOptions = {
	// Drop layered (deformable 3D) clothing, dynamic heads and body-part bundles
	// so the remaining classic items and rigid accessories always fit.
	blocky: boolean;
	// Skip classic T-Shirts — they are just a flat image on the torso, not real clothing.
	noTShirt: boolean;
	// The fewest / most "extra" items (hats + accessories) a roll adds. The core
	// slots (top, bottom, hair, face) always roll regardless of these.
	minExtras: number;
	maxExtras: number;
	// Bias each roll toward items that share an analogous colour palette.
	colorMatch: boolean;
};

// Bounds + defaults for the Min/Max items steppers.
export const EXTRAS_MIN = 0;
export const EXTRAS_MAX = 8;
export const MIN_EXTRAS_DEFAULT = 0;
export const MAX_EXTRAS_DEFAULT = 4;

// The quality layer. Body parts and head replacements are never in scope; the
// options narrow the pool further for a better-looking random outfit.
export function isPoolEligible(typeData: AssetTypeData, options: RollOptions): boolean {
	if (typeData.isBodyPart || typeData.isPartOfHead || typeData.isMakeup) {
		return false;
	}
	if (options.blocky && typeData.isLayered) {
		return false;
	}
	if (options.noTShirt && typeData.assetTypeId === TSHIRT) {
		return false;
	}
	return true;
}

// Types whose thumbnail colour is meaningless for outfit matching and so are
// excluded from colour analysis / seeding: T-Shirts (a flat decal image) and
// heads. (Bundles aren't wearable assets, so they are never analysed anyway.)
const COLOR_IGNORED_TYPE_IDS = new Set<number>([TSHIRT, HEAD, DYNAMIC_HEAD]);

export function isColorRelevantType(assetTypeId: number): boolean {
	return !COLOR_IGNORED_TYPE_IDS.has(assetTypeId);
}
