import classNames from "classnames";
import type { ComponentChildren } from "preact";
import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { addMessageListener, sendMessage } from "src/ts/helpers/communication/dom";
import { getMessage } from "src/ts/helpers/i18n/getMessage";
import {
	type AvatarAssetDefinitionWithTypes,
	getAuthenticatedUserAvatar,
	setWearingAssets,
} from "src/ts/helpers/requests/services/avatar";
import { listAllUserWearableInventoryAssets } from "src/ts/utils/assets";
import { getAuthenticatedUser } from "src/ts/utils/authenticatedUser";
import { getAssetTypeData } from "src/ts/utils/itemTypes";
import Button from "../../core/Button";
import { warning } from "../../core/systemFeedback/helpers/globalSystemFeedback";
import usePromise from "../../hooks/usePromise";
import { type AnalyzeProgress, analyzeWardrobe, getColorIndex, loadColorCache } from "./colors";
import { CheckIcon, DiceIcon, LockClosedIcon, LockOpenIcon } from "./icons";
import { buildRandomOutfit, hasRollableItems, isSameAssetSet } from "./randomize";
import {
	blockySignal,
	colorMatchSignal,
	maxExtrasSignal,
	minExtrasSignal,
	noTShirtSignal,
} from "./settings";
import { isColorRelevantType, type SlotKey, SLOTS, slotOfAssetType } from "./slots";

// Let the avatar editor finish its own (rate-limited) load before our colour scan
// starts trickling in.
const SCAN_START_DELAY_MS = 3000;
// Ignore machine-gun clicks so each roll's re-equip doesn't burst the editor's
// ownership checks.
const ROLL_COOLDOWN_MS = 500;

const SLOT_LABEL_KEY = {
	top: "avatar.outfitRoulette.slot.top",
	bottom: "avatar.outfitRoulette.slot.bottom",
	hair: "avatar.outfitRoulette.slot.hair",
	face: "avatar.outfitRoulette.slot.face",
	hat: "avatar.outfitRoulette.slot.hat",
	glasses: "avatar.outfitRoulette.slot.glasses",
	neck: "avatar.outfitRoulette.slot.neck",
	shoulders: "avatar.outfitRoulette.slot.shoulders",
	front: "avatar.outfitRoulette.slot.front",
	back: "avatar.outfitRoulette.slot.back",
	waist: "avatar.outfitRoulette.slot.waist",
} as const satisfies Record<SlotKey, string>;

export default function OutfitRoulettePanel({ children }: { children?: ComponentChildren }) {
	const [currentAssets, setCurrentAssets] = useState<AvatarAssetDefinitionWithTypes[]>();
	const [rolling, setRolling] = useState(false);
	const [spinKey, setSpinKey] = useState(0);
	const [lockedSlots, setLockedSlots] = useState<ReadonlySet<SlotKey>>(() => new Set<SlotKey>());

	// The editor's live state — authoritative once it arrives.
	useEffect(
		() => addMessageListener("avatar.avatarUpdated", (avatar) => setCurrentAssets(avatar.assets)),
		[],
	);

	// Fallback seed from the API so the button works even when the avatar editor
	// never emits its state (e.g. it errored / got rate-limited).
	useEffect(() => {
		let cancelled = false;
		getAuthenticatedUserAvatar()
			.then((avatar) => {
				if (!cancelled) setCurrentAssets((prev) => prev ?? avatar.assets);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, []);

	const [pool] = usePromise(
		() =>
			getAuthenticatedUser().then((user) =>
				user ? listAllUserWearableInventoryAssets(user.userId) : [],
			),
		[],
	);

	// Behaviour comes from the shared settings (edited in the Advanced
	// Customization → Randomizer tab).
	const blocky = blockySignal.value;
	const noTShirt = noTShirtSignal.value;
	const colorMatch = colorMatchSignal.value;
	const maxExtras = maxExtrasSignal.value;
	const minExtras = Math.min(minExtrasSignal.value, maxExtras);

	const options = useMemo(
		() => ({ blocky, noTShirt, colorMatch, minExtras, maxExtras }),
		[blocky, noTShirt, colorMatch, minExtras, maxExtras],
	);

	const canRoll = useMemo(() => {
		if (!currentAssets || !pool) return false;
		return hasRollableItems(pool, lockedSlots, options);
	}, [currentAssets, pool, lockedSlots, options]);

	const loading = !currentAssets || !pool;

	// The wardrobe we analyse for colour: rollable items (type maps to a slot),
	// minus types whose colour is meaningless (T-Shirts, heads).
	const wardrobeIds = useMemo(() => {
		if (!pool) return [] as number[];
		const ids: number[] = [];
		for (const item of pool) {
			const typeData = getAssetTypeData(item.assetType);
			if (
				typeData &&
				slotOfAssetType(typeData.assetTypeId) !== undefined &&
				isColorRelevantType(typeData.assetTypeId)
			) {
				ids.push(item.assetId);
			}
		}
		return ids;
	}, [pool]);

	const [analysis, setAnalysis] = useState<AnalyzeProgress | null>(null);

	// When Color match is on, analyse the wardrobe's colours (cached + persisted,
	// so this only does real work the first time / for newly-owned items).
	useEffect(() => {
		if (!colorMatch || !wardrobeIds.length) return;

		const controller = new AbortController();
		let cancelled = false;
		const timer = setTimeout(() => {
			loadColorCache().then(() => {
				if (cancelled) return;
				analyzeWardrobe(wardrobeIds, {
					signal: controller.signal,
					onProgress: (progress) => {
						if (!cancelled) setAnalysis(progress);
					},
				});
			});
		}, SCAN_START_DELAY_MS);

		return () => {
			cancelled = true;
			controller.abort();
			clearTimeout(timer);
		};
	}, [colorMatch, wardrobeIds]);

	const lastRollAt = useRef(0);

	const toggleLock = useCallback((key: SlotKey) => {
		setLockedSlots((prev) => {
			const next = new Set(prev);
			if (next.has(key)) {
				next.delete(key);
			} else {
				next.add(key);
			}
			return next;
		});
	}, []);

	const onRandomize = useCallback(() => {
		if (!currentAssets || !pool || rolling) return;
		const now = performance.now();
		if (now - lastRollAt.current < ROLL_COOLDOWN_MS) return;
		lastRollAt.current = now;

		const previous = currentAssets;
		const colorIndex = getColorIndex();

		let next = buildRandomOutfit({ pool, current: previous, lockedSlots, options, colorIndex });
		// Avoid landing on the exact same look when the pool allows variety.
		if (isSameAssetSet(next, previous)) {
			next = buildRandomOutfit({ pool, current: previous, lockedSlots, options, colorIndex });
		}

		setSpinKey((key) => key + 1);
		setRolling(true);
		sendMessage("avatar.updateAssets", next);
		setWearingAssets({ assets: next })
			.then((response) => {
				if (response.invalidAssetIds?.length) {
					const invalid = new Set(response.invalidAssetIds);
					const valid = next.filter((asset) => !invalid.has(asset.id));
					sendMessage("avatar.updateAssets", valid);
				}
			})
			.catch(() => {
				// A true rollback — restore exactly what was worn before the roll.
				sendMessage("avatar.updateAssets", previous);
				warning(getMessage("avatar.outfitRoulette.systemFeedback.error"));
			})
			.finally(() => setRolling(false));
	}, [currentAssets, pool, lockedSlots, options, rolling]);

	return (
		<div className="roseal-outfit-roulette">
			<div className="ror-actions">
				<Button
					id="outfit-roulette-btn"
					type="secondary"
					onClick={onRandomize}
					disabled={!canRoll || rolling}
					title={
						loading
							? getMessage("avatar.outfitRoulette.loading")
							: !canRoll
								? getMessage("avatar.outfitRoulette.emptyInventory")
								: undefined
					}
				>
					<span key={spinKey} className="ror-die">
						<DiceIcon />
					</span>
					<span className="ror-btn-label">
						{getMessage("avatar.outfitRoulette.buttonText")}
					</span>
				</Button>
				{children}
			</div>

			<div className="ror-section">
				<span className="ror-section-label">
					{getMessage("avatar.outfitRoulette.keepLabel")}
				</span>
				<div className="ror-chip-row">
					{SLOTS.map((slot) => {
						const locked = lockedSlots.has(slot.key);
						return (
							<button
								key={slot.key}
								type="button"
								className={classNames("ror-chip", "ror-chip-lock", {
									"is-active": locked,
								})}
								aria-pressed={locked}
								title={getMessage("avatar.outfitRoulette.lockTooltip")}
								onClick={() => toggleLock(slot.key)}
							>
								<span className="ror-chip-icon">
									{locked ? <LockClosedIcon /> : <LockOpenIcon />}
								</span>
								<span className="ror-chip-label">
									{getMessage(SLOT_LABEL_KEY[slot.key])}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{colorMatch && analysis && (
				<div className="ror-analysis">
					{analysis.done < analysis.total ? (
						<>
							<span className="ror-analysis-label">
								{getMessage("avatar.outfitRoulette.analyzing", {
									done: analysis.done,
									total: analysis.total,
								})}
							</span>
							<div className="ror-analysis-track">
								<div
									className="ror-analysis-fill"
									style={{ width: `${(analysis.done / analysis.total) * 100}%` }}
								/>
							</div>
						</>
					) : (
						<span className="ror-analysis-label is-done">
							<CheckIcon />
							{getMessage("avatar.outfitRoulette.analyzed")}
						</span>
					)}
				</div>
			)}
		</div>
	);
}
