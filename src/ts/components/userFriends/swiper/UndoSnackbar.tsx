import { useEffect } from "preact/hooks";
import { getMessage } from "src/ts/helpers/i18n/getMessage";
import type { SwiperFriend } from "./types";

export type UndoSnackbarProps = {
	friend: SwiperFriend;
	durationMs: number;
	onUndo: () => void;
	onExpire: () => void;
};

/**
 * Bottom snackbar shown after a friend is swiped away. The actual unfriend is
 * deferred by the overlay for `durationMs`; clicking "Undo" within the window
 * cancels it. Remounted (via a changing `key`) on every removal so the
 * countdown/progress bar restarts.
 */
export default function UndoSnackbar({ friend, durationMs, onUndo, onExpire }: UndoSnackbarProps) {
	useEffect(() => {
		const timeout = setTimeout(onExpire, durationMs);
		return () => clearTimeout(timeout);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- run once per mount (key changes remount)
	}, []);

	return (
		<div className="rfs-snackbar">
			<span className="rfs-snackbar-text">
				{getMessage("friendsSwiper.undo.message", {
					name: friend.combinedName || friend.username,
				})}
			</span>
			<button type="button" className="rfs-snackbar-undo" onClick={onUndo}>
				{getMessage("friendsSwiper.undo.action")}
			</button>
			<span className="rfs-snackbar-progress" style={{ animationDuration: `${durationMs}ms` }} />
		</div>
	);
}
