import classNames from "classnames";
import type { JSX, RefObject } from "preact";
import { useEffect, useState } from "preact/hooks";
import { getMessage } from "src/ts/helpers/i18n/getMessage";
import {
	asLocaleString,
	getRegularTime,
	getShortRelativeTime,
} from "src/ts/helpers/i18n/intlFormats";
import type { ThumbnailType } from "src/ts/helpers/requests/services/thumbnails";
import Loading from "../../core/Loading";
import Thumbnail from "../../core/Thumbnail";
import VerifiedBadge from "../../icons/VerifiedBadge";
import { IconCalendar, IconHeart, IconPeople, SocialIcon } from "./icons";
import type { SwipeDirection } from "./useSwipeGesture";
import useSwipeGesture from "./useSwipeGesture";
import useCardStats from "./useCardStats";
import type { MutualsControl, SwiperFriend } from "./types";

export type CardControl = {
	triggerExit: (direction: SwipeDirection) => void;
};

export type FriendCardProps = {
	friend: SwiperFriend;
	depth: number;
	isTop: boolean;
	loadStats: boolean;
	onSwipe: (friend: SwiperFriend, direction: SwipeDirection) => void;
	controlRef?: RefObject<CardControl | null>;
	mutualsControl?: MutualsControl;
};

const SWIPE_THRESHOLD = 120;

type GalleryImage = {
	key: string;
	type: ThumbnailType;
	targetId: number;
	alt: string;
	label: string;
};

// Two stops for the per-friend image backdrop, derived deterministically from
// the user id so every card gets a distinct but stable color behind the avatar.
function bannerGradient(userId: number): string {
	const hue = userId % 360;
	return `linear-gradient(135deg, hsl(${hue} 70% 50%), hsl(${(hue + 38) % 360} 68% 38%))`;
}

// Keep clicks/taps on interactive children (social links) from bubbling to the
// card, which would otherwise treat them as a tap-to-page or drag.
const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();

export default function FriendCard({
	friend,
	depth,
	isTop,
	loadStats,
	onSwipe,
	controlRef,
	mutualsControl,
}: FriendCardProps) {
	const [stats, statsFetched] = useCardStats(friend.userId, loadStats);
	const [photoIndex, setPhotoIndex] = useState(0);

	const images: GalleryImage[] = [
		{
			key: `avatar-${friend.userId}`,
			type: "Avatar",
			targetId: friend.userId,
			alt: friend.combinedName || friend.username,
			label: getMessage("friendsSwiper.currentAvatar"),
		},
		...(stats?.outfits ?? []).map(
			(outfit): GalleryImage => ({
				key: `outfit-${outfit.id}`,
				type: "Outfit",
				targetId: outfit.id,
				alt: outfit.name,
				label: outfit.name,
			}),
		),
	];
	const safeIndex = Math.min(photoIndex, images.length - 1);
	const current = images[safeIndex];

	const swipe = useSwipeGesture({
		onSwipe: (direction) => onSwipe(friend, direction),
		onTap: (zone) => {
			if (images.length <= 1) return;
			setPhotoIndex((index) => {
				const clamped = Math.min(index, images.length - 1);
				return zone === "left"
					? Math.max(0, clamped - 1)
					: Math.min(images.length - 1, clamped + 1);
			});
		},
		threshold: SWIPE_THRESHOLD,
		enabled: isTop,
	});

	useEffect(() => {
		if (isTop && controlRef) {
			controlRef.current = { triggerExit: swipe.triggerExit };
		}
	}, [isTop, swipe.triggerExit, controlRef]);

	const offsetX = isTop ? swipe.offsetX : 0;
	const keepOpacity = Math.max(0, Math.min(1, offsetX / SWIPE_THRESHOLD));
	const removeOpacity = Math.max(0, Math.min(1, -offsetX / SWIPE_THRESHOLD));

	const baseShadow = "0 18px 44px rgba(0, 0, 0, 0.32)";
	let glow = "";
	if (keepOpacity > 0) {
		glow = `, 0 0 0 ${(3 * keepOpacity).toFixed(1)}px rgba(51, 95, 255, ${(0.7 * keepOpacity).toFixed(2)})`;
	} else if (removeOpacity > 0) {
		glow = `, 0 0 0 ${(3 * removeOpacity).toFixed(1)}px rgba(223, 40, 31, ${(0.7 * removeOpacity).toFixed(2)})`;
	}

	const style: JSX.CSSProperties = isTop
		? { ...swipe.style, zIndex: 20, boxShadow: baseShadow + glow }
		: {
				transform: `translateY(${depth * 16}px) scale(${1 - depth * 0.05})`,
				transition: "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
				zIndex: 10 - depth,
				boxShadow: baseShadow,
			};

	// Cards behind the top one render as clean blank shells so their content
	// never pokes awkwardly out of the bottom of the stack.
	if (!isTop) {
		return <div className="rfs-card rfs-card-peek" style={style} />;
	}

	const displayName = friend.combinedName || friend.username;
	const previous = stats?.previousUsernames ?? [];
	const socials = stats?.socialLinks ?? [];
	const mutualCount = stats?.mutuals.length ?? 0;
	const mutualNames = stats?.mutuals.map((mutual) => mutual.displayName).join(", ");
	const mutualsInteractive = !!mutualsControl && !!stats && mutualCount > 0;

	const nameTitle =
		previous.length > 0
			? `${getMessage("friendsSwiper.previousUsernamesTitle")}: ${previous.join(", ")}`
			: displayName;

	return (
		<div className="rfs-card rfs-card-top" style={style} {...swipe.handlers}>
			<div className="rfs-gallery" style={{ background: bannerGradient(friend.userId) }}>
				{images.length > 1 && (
					<div className="rfs-gallery-bars">
						{images.map((image, index) => (
							<span
								key={image.key}
								className={classNames("rfs-bar", { active: index === safeIndex })}
							/>
						))}
					</div>
				)}
				<Thumbnail
					key={current.key}
					request={{
						type: current.type,
						targetId: current.targetId,
						size: "420x420",
					}}
					containerClassName="rfs-gallery-image"
					altText={current.alt}
				/>
				<div className="rfs-stamp rfs-stamp-keep" style={{ opacity: keepOpacity }}>
					{getMessage("friendsSwiper.keep")}
				</div>
				<div className="rfs-stamp rfs-stamp-remove" style={{ opacity: removeOpacity }}>
					{getMessage("friendsSwiper.remove")}
				</div>
				{current.label && <div className="rfs-gallery-caption">{current.label}</div>}
			</div>

			<div className="rfs-card-info">
				<div className="rfs-card-name">
					<span
						className={classNames("rfs-name-text", {
							"rfs-name-hoverable": previous.length > 0,
						})}
						title={nameTitle}
					>
						{displayName}
					</span>
					{friend.isVerified && <VerifiedBadge width={18} height={18} />}
				</div>
				<div className="rfs-card-username">@{friend.username}</div>

				{socials.length > 0 && (
					<div className="rfs-socials">
						{socials.map((social) => (
							<a
								key={social.platform}
								className={`rfs-social rfs-social-${social.platform}`}
								href={social.url}
								target="_blank"
								rel="noreferrer"
								title={social.title || social.platform}
								onPointerDown={stop}
								onMouseDown={stop}
								onClick={stop}
							>
								<SocialIcon platform={social.platform} />
							</a>
						))}
					</div>
				)}

				{loadStats && (
					<div className="rfs-card-stats">
						{!statsFetched ? (
							<Loading size="sm" />
						) : (
							<ul>
								{stats?.friendsSince && (
									<li className="rfs-stat">
										<span className="rfs-stat-icon">
											<IconHeart />
										</span>
										<span className="rfs-stat-text">
											{getMessage("friendsSwiper.stats.friendsSince", {
												date: getRegularTime(stats.friendsSince),
												age: getShortRelativeTime(stats.friendsSince),
											})}
										</span>
									</li>
								)}
								<li
									className={classNames("rfs-stat", {
										"rfs-stat-mutuals": mutualsInteractive,
									})}
									title={
										!mutualsInteractive && mutualCount > 0
											? mutualNames
											: undefined
									}
									onPointerDown={mutualsInteractive ? stop : undefined}
									onMouseDown={mutualsInteractive ? stop : undefined}
									onMouseEnter={
										mutualsInteractive
											? (e) =>
													mutualsControl?.open(
														e.currentTarget.getBoundingClientRect(),
														stats!.mutuals,
														false,
													)
											: undefined
									}
									onMouseLeave={
										mutualsInteractive
											? () => mutualsControl?.scheduleClose()
											: undefined
									}
									onClick={
										mutualsInteractive
											? (e) => {
													e.stopPropagation();
													mutualsControl?.open(
														e.currentTarget.getBoundingClientRect(),
														stats!.mutuals,
														true,
													);
												}
											: undefined
									}
									onContextMenu={
										mutualsInteractive
											? (e) => {
													e.preventDefault();
													e.stopPropagation();
													mutualsControl?.open(
														e.currentTarget.getBoundingClientRect(),
														stats!.mutuals,
														true,
													);
												}
											: undefined
									}
								>
									<span className="rfs-stat-icon">
										<IconPeople />
									</span>
									<span className="rfs-stat-text">
										{getMessage("friendsSwiper.stats.mutuals", {
											count: asLocaleString(mutualCount),
											countNum: mutualCount,
										})}
									</span>
								</li>
								{stats?.createdDate && (
									<li className="rfs-stat">
										<span className="rfs-stat-icon">
											<IconCalendar />
										</span>
										<span className="rfs-stat-text">
											{getMessage("friendsSwiper.stats.joined", {
												date: getRegularTime(stats.createdDate),
												age: getShortRelativeTime(stats.createdDate),
											})}
										</span>
									</li>
								)}
							</ul>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
