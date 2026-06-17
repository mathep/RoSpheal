import { useEffect, useRef } from "preact/hooks";
import { getMessage } from "src/ts/helpers/i18n/getMessage";
import type { MutualFriendData } from "src/ts/utils/friends";
import { getUserProfileLink } from "src/ts/utils/links";
import Thumbnail from "../../core/Thumbnail";

const WIDTH = 248;

export type MutualsPopoverProps = {
	anchor: DOMRect;
	mutuals: MutualFriendData[];
	pinned: boolean;
	onClose: () => void;
	onMouseEnter: () => void;
	onMouseLeave: () => void;
};

/**
 * Floating list of mutual friends. Rendered as a sibling of the dialog (the
 * overlay is not transformed) so `position: fixed` escapes the card's clipping.
 * Opens on hover (unpinned) or click/right-click (pinned); when pinned it closes
 * on outside-click or Escape.
 */
export default function MutualsPopover({
	anchor,
	mutuals,
	pinned,
	onClose,
	onMouseEnter,
	onMouseLeave,
}: MutualsPopoverProps) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!pinned) return;

		const onPointerDown = (event: MouseEvent) => {
			if (ref.current && !ref.current.contains(event.target as Node)) {
				onClose();
			}
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};

		document.addEventListener("mousedown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("mousedown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [pinned, onClose]);

	const viewportWidth = globalThis.innerWidth;
	const viewportHeight = globalThis.innerHeight;
	const left = Math.max(
		8,
		Math.min(anchor.left + anchor.width / 2 - WIDTH / 2, viewportWidth - WIDTH - 8),
	);
	const placeAbove = anchor.top > viewportHeight - anchor.bottom;
	const position = placeAbove
		? { left: `${left}px`, bottom: `${viewportHeight - anchor.top + 8}px` }
		: { left: `${left}px`, top: `${anchor.bottom + 8}px` };

	return (
		<div
			ref={ref}
			className="rfs-mutuals-popover"
			style={{ width: `${WIDTH}px`, ...position }}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
		>
			<div className="rfs-mutuals-title">{getMessage("friendsSwiper.mutualsTitle")}</div>
			<ul className="rfs-mutuals-list">
				{mutuals.map((mutual) => (
					<li key={mutual.id}>
						<a
							className="rfs-mutual-row"
							href={getUserProfileLink(mutual.id)}
							target="_blank"
							rel="noreferrer"
						>
							<Thumbnail
								request={{
									type: "AvatarHeadShot",
									targetId: mutual.id,
									size: "48x48",
								}}
								containerClassName="rfs-mutual-avatar"
								altText={mutual.displayName}
							/>
							<span className="rfs-mutual-names">
								<span className="rfs-mutual-display">{mutual.displayName}</span>
								<span className="rfs-mutual-username">@{mutual.username}</span>
							</span>
						</a>
					</li>
				))}
			</ul>
		</div>
	);
}
