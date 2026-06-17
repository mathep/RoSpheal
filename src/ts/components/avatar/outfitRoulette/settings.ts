import storageSignal from "../../hooks/storageSignal";
import { MAX_EXTRAS_DEFAULT, MIN_EXTRAS_DEFAULT } from "./slots";

// Shared, persisted Outfit Roulette options. Defined once at module scope so the
// editor-page panel (which reads them to roll) and the Advanced Customization
// "Randomizer" settings tab (which edits them) stay in sync.
export const [blockySignal, setBlocky] = storageSignal<boolean>(
	"avatarOutfitRouletteBlocky",
	true,
);
export const [noTShirtSignal, setNoTShirt] = storageSignal<boolean>(
	"avatarOutfitRouletteNoTShirt",
	true,
);
export const [colorMatchSignal, setColorMatch] = storageSignal<boolean>(
	"avatarOutfitRouletteColorMatch",
	false,
);
export const [minExtrasSignal, setMinExtras] = storageSignal<number>(
	"avatarOutfitRouletteMinExtras",
	MIN_EXTRAS_DEFAULT,
);
export const [maxExtrasSignal, setMaxExtras] = storageSignal<number>(
	"avatarOutfitRouletteMaxExtras",
	MAX_EXTRAS_DEFAULT,
);
