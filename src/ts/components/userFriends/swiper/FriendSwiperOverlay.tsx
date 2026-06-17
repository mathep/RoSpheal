import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import Confetti from "react-confetti";
import { getMessage } from "src/ts/helpers/i18n/getMessage";
import { asLocaleString } from "src/ts/helpers/i18n/intlFormats";
import { profileProcessor } from "src/ts/helpers/processors/profileProcessor";
import { unfriendUser } from "src/ts/helpers/requests/services/users";
import type { MutualFriendData } from "src/ts/utils/friends";
import { listAllFriends } from "src/ts/utils/users";
import Button from "../../core/Button";
import Loading from "../../core/Loading";
import PillToggle from "../../core/PillToggle";
import { warning } from "../../core/systemFeedback/helpers/globalSystemFeedback";
import usePromise from "../../hooks/usePromise";
import FriendCard, { type CardControl } from "./FriendCard";
import { IconClose, IconHeart, IconX } from "./icons";
import MutualsPopover from "./MutualsPopover";
import type { SwipeDirection } from "./useSwipeGesture";
import UndoSnackbar from "./UndoSnackbar";
import type { MutualsControl, SwiperFriend } from "./types";

export type FriendSwiperOverlayProps = {
	userId: number;
	onClose: () => void;
};

const UNDO_DURATION_MS = 6000;
const VISIBLE_CARDS = 3;

type SortMode = "newest" | "oldest" | "random";

// `rank` maps userId -> index in the original (newest-first) load order, so we
// can re-order the remaining queue without re-fetching friendship dates.
function orderFriends(
	list: SwiperFriend[],
	mode: SortMode,
	rank: Map<number, number>,
): SwiperFriend[] {
	if (mode === "random") {
		const shuffled = [...list];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		return shuffled;
	}

	const sorted = [...list].sort((a, b) => (rank.get(a.userId) ?? 0) - (rank.get(b.userId) ?? 0));
	return mode === "oldest" ? sorted.reverse() : sorted;
}

export default function FriendSwiperOverlay({ userId, onClose }: FriendSwiperOverlayProps) {
	const [loadedFriends, fetched, loadError] = usePromise(async () => {
		const list = await listAllFriends(userId);
		if (!list.length) return [] as SwiperFriend[];

		const profiles = await profileProcessor.requestBatch(
			list.map((friend) => ({ userId: friend.id })),
		);

		return profiles
			.filter((profile) => profile && !profile.isDeleted)
			.map(
				(profile): SwiperFriend => ({
					userId: profile.userId,
					combinedName: profile.names.combinedName,
					username: profile.names.username,
					isVerified: profile.isVerified,
				}),
			);
	}, [userId]);

	const [queue, setQueue] = useState<SwiperFriend[]>([]);
	const [total, setTotal] = useState(0);
	const [ready, setReady] = useState(false);
	const [removed, setRemoved] = useState<SwiperFriend[]>([]);
	const [kept, setKept] = useState<SwiperFriend[]>([]);
	const [snackbar, setSnackbar] = useState<{ friend: SwiperFriend; seq: number } | null>(null);
	const [sort, setSort] = useState<SortMode>("newest");
	const [mutualsPopover, setMutualsPopover] = useState<{
		anchor: DOMRect;
		mutuals: MutualFriendData[];
		pinned: boolean;
	} | null>(null);

	const initRef = useRef(false);
	const seqRef = useRef(0);
	const pending = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
	const cardControl = useRef<CardControl | null>(null);
	const rankRef = useRef<Map<number, number>>(new Map());
	const mutualsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearMutualsTimer = () => {
		if (mutualsTimer.current) {
			clearTimeout(mutualsTimer.current);
			mutualsTimer.current = null;
		}
	};

	const closeMutuals = () => {
		clearMutualsTimer();
		setMutualsPopover(null);
	};

	const mutualsControl: MutualsControl = {
		open: (anchor, mutuals, pinned) => {
			clearMutualsTimer();
			setMutualsPopover((prev) => {
				// Clicking the chip while already pinned toggles it closed.
				if (pinned && prev?.pinned) return null;
				return { anchor, mutuals, pinned: pinned || !!prev?.pinned };
			});
		},
		scheduleClose: () => {
			clearMutualsTimer();
			mutualsTimer.current = setTimeout(() => {
				setMutualsPopover((prev) => (prev && !prev.pinned ? null : prev));
			}, 140);
		},
	};

	useEffect(() => () => clearMutualsTimer(), []);

	useEffect(() => {
		if (!initRef.current && fetched && loadedFriends) {
			initRef.current = true;
			rankRef.current = new Map(
				loadedFriends.map((friend, index) => [friend.userId, index]),
			);
			setQueue(loadedFriends);
			setTotal(loadedFriends.length);
			setReady(true);
		}
	}, [fetched, loadedFriends]);

	const flushPending = () => {
		for (const [pendingUserId, timeout] of pending.current) {
			clearTimeout(timeout);
			unfriendUser({ userId: pendingUserId }).catch(() => {});
		}
		pending.current.clear();
	};

	// Flush any still-pending removals if the overlay is unmounted some other way
	// (e.g. page navigation) without going through handleClose.
	useEffect(() => () => flushPending(), []);

	const handleSwipe = (friend: SwiperFriend, direction: SwipeDirection) => {
		closeMutuals();
		setQueue((current) => current.filter((item) => item.userId !== friend.userId));

		if (direction === "left") {
			setRemoved((current) => [...current, friend]);

			const timeout = setTimeout(() => {
				pending.current.delete(friend.userId);
				unfriendUser({ userId: friend.userId }).catch(() =>
					warning(
						getMessage("friendsSwiper.error", {
							name: friend.combinedName || friend.username,
						}),
					),
				);
			}, UNDO_DURATION_MS);

			pending.current.set(friend.userId, timeout);
			seqRef.current += 1;
			setSnackbar({ friend, seq: seqRef.current });
		} else {
			setKept((current) => [...current, friend]);
		}
	};

	const handleUndo = (friend: SwiperFriend) => {
		const timeout = pending.current.get(friend.userId);
		if (timeout) {
			clearTimeout(timeout);
			pending.current.delete(friend.userId);
		}

		setRemoved((current) => current.filter((item) => item.userId !== friend.userId));
		setQueue((current) => [friend, ...current]);
		setSnackbar(null);
	};

	const handleSnackbarExpire = (seq: number) => {
		setSnackbar((current) => (current && current.seq === seq ? null : current));
	};

	const handleClose = () => {
		flushPending();
		onClose();
	};

	const handleSortChange = (mode: SortMode) => {
		closeMutuals();
		setSort(mode);
		setQueue((current) => orderFriends(current, mode, rankRef.current));
	};

	const sortItems: { id: SortMode; label: string }[] = [
		{ id: "newest", label: getMessage("friendsSwiper.sort.newest") },
		{ id: "oldest", label: getMessage("friendsSwiper.sort.oldest") },
		{ id: "random", label: getMessage("friendsSwiper.sort.random") },
	];

	const reviewedCount = removed.length + kept.length;
	const isDone = ready && total > 0 && queue.length === 0;
	const isEmpty = ready && total === 0;

	let body: ComponentChildren;
	if (loadError) {
		body = (
			<div className="rfs-message">
				<p>{getMessage("friendsSwiper.loadError")}</p>
				<Button type="cta" onClick={handleClose}>
					{getMessage("friendsSwiper.done.close")}
				</Button>
			</div>
		);
	} else if (!ready) {
		body = (
			<div className="rfs-message">
				<Loading />
			</div>
		);
	} else if (isEmpty) {
		body = (
			<div className="rfs-message">
				<p>{getMessage("friendsSwiper.empty")}</p>
				<Button type="cta" onClick={handleClose}>
					{getMessage("friendsSwiper.done.close")}
				</Button>
			</div>
		);
	} else if (isDone) {
		body = (
			<div className="rfs-done">
				<Confetti recycle={false} numberOfPieces={500} tweenDuration={8000} />
				<h3 className="rfs-done-title">{getMessage("friendsSwiper.done.title")}</h3>
				<p className="rfs-done-summary">
					{getMessage("friendsSwiper.done.summary", {
						removed: removed.length,
						kept: kept.length,
					})}
				</p>
				<Button type="cta" onClick={handleClose}>
					{getMessage("friendsSwiper.done.close")}
				</Button>
			</div>
		);
	} else {
		body = (
			<>
				<div className="rfs-sort">
					<span className="rfs-sort-label">{getMessage("friendsSwiper.sort.label")}</span>
					<PillToggle items={sortItems} currentId={sort} onClick={handleSortChange} />
				</div>
				<div className="rfs-card-stack">
					{queue.slice(0, VISIBLE_CARDS).map((friend, index) => (
						<FriendCard
							key={friend.userId}
							friend={friend}
							depth={index}
							isTop={index === 0}
							loadStats={index <= 1}
							onSwipe={handleSwipe}
							controlRef={index === 0 ? cardControl : undefined}
							mutualsControl={index === 0 ? mutualsControl : undefined}
						/>
					))}
				</div>
				<div className="rfs-controls">
					<button
						type="button"
						className="rfs-action rfs-action-remove"
						onClick={() => cardControl.current?.triggerExit("left")}
						aria-label={getMessage("friendsSwiper.remove")}
						title={getMessage("friendsSwiper.remove")}
					>
						<IconX className="rfs-action-icon" />
					</button>
					<span className="rfs-counter">
						{getMessage("friendsSwiper.counter", {
							current: asLocaleString(Math.min(reviewedCount + 1, total)),
							total: asLocaleString(total),
						})}
					</span>
					<button
						type="button"
						className="rfs-action rfs-action-keep"
						onClick={() => cardControl.current?.triggerExit("right")}
						aria-label={getMessage("friendsSwiper.keep")}
						title={getMessage("friendsSwiper.keep")}
					>
						<IconHeart className="rfs-action-icon" />
					</button>
				</div>
			</>
		);
	}

	return (
		<div className="roseal-friends-swiper-overlay" role="dialog" aria-modal="true">
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismissal */}
			<div className="rfs-backdrop" onClick={handleClose} />
			<div className="rfs-dialog">
				<div className="rfs-dialog-header">
					<h2 className="rfs-dialog-title">{getMessage("friendsSwiper.title")}</h2>
					<button
						type="button"
						className="rfs-dialog-close"
						onClick={handleClose}
						aria-label="Close"
					>
						<IconClose className="rfs-close-icon" />
					</button>
				</div>
				{ready && total > 0 && (
					<div className="rfs-progress">
						<div
							className="rfs-progress-fill"
							style={{ width: `${(reviewedCount / total) * 100}%` }}
						/>
					</div>
				)}
				<div className="rfs-dialog-body">{body}</div>
				{snackbar && (
					<UndoSnackbar
						key={snackbar.seq}
						friend={snackbar.friend}
						durationMs={UNDO_DURATION_MS}
						onUndo={() => handleUndo(snackbar.friend)}
						onExpire={() => handleSnackbarExpire(snackbar.seq)}
					/>
				)}
			</div>
			{mutualsPopover && (
				<MutualsPopover
					anchor={mutualsPopover.anchor}
					mutuals={mutualsPopover.mutuals}
					pinned={mutualsPopover.pinned}
					onClose={closeMutuals}
					onMouseEnter={clearMutualsTimer}
					onMouseLeave={mutualsControl.scheduleClose}
				/>
			)}
		</div>
	);
}
