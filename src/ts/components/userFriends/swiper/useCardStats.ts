import { getOrSetCache } from "src/ts/helpers/cache";
import { listUserAvatarOutfits } from "src/ts/helpers/requests/services/avatar";
import {
	getProfileComponentsData,
	type SocialLinksProfileComponent,
} from "src/ts/helpers/requests/services/misc";
import { getUserById } from "src/ts/helpers/requests/services/users";
import {
	getMutualFriends,
	getMyUserFriendshipCreationDate,
	type MutualFriendData,
} from "src/ts/utils/friends";
import usePromise from "../../hooks/usePromise";

export type CardOutfit = {
	id: number;
	name: string;
};

export type SocialPlatform = keyof SocialLinksProfileComponent;

export type SocialLink = {
	platform: SocialPlatform;
	url: string;
	title: string | null;
};

export type FriendCardStats = {
	friendsSince?: Date;
	mutuals: MutualFriendData[];
	createdDate?: Date;
	previousUsernames: string[];
	outfits: CardOutfit[];
	socialLinks: SocialLink[];
};

// Stable display order; only platforms with a url are kept.
const SOCIAL_ORDER: SocialPlatform[] = [
	"youtube",
	"twitch",
	"twitter",
	"discord",
	"guilded",
	"facebook",
];

function toSocialLinks(links: SocialLinksProfileComponent | null | undefined): SocialLink[] {
	if (!links) return [];

	const result: SocialLink[] = [];
	for (const platform of SOCIAL_ORDER) {
		const link = links[platform];
		if (link?.url) {
			result.push({ platform, url: link.url, title: link.title });
		}
	}
	return result;
}

/**
 * Lazily loads everything a friend card shows. Pass `enabled = false` for cards
 * that are not near the top of the stack so we don't fire requests for hundreds
 * of friends at once. Each source fails independently (missing/private data just
 * yields an empty value), and results are cached so undo/re-sort don't refetch.
 *
 * Previous usernames AND social links come from a single profile-components call.
 */
export default function useCardStats(userId: number, enabled: boolean) {
	return usePromise(async (): Promise<FriendCardStats | undefined> => {
		if (!enabled) return undefined;

		const [friendsSince, mutuals, details, outfits, profile] = await Promise.all([
			getMyUserFriendshipCreationDate(userId).catch(() => undefined),
			getMutualFriends(userId).catch(() => [] as MutualFriendData[]),
			getUserById({ userId }).catch(() => undefined),
			getOrSetCache({
				key: ["users", userId, "swiperOutfits"],
				fn: () =>
					listUserAvatarOutfits({
						userId,
						outfitType: "Avatar",
						itemsPerPage: 25,
						page: 1,
					}).then((res) =>
						res.data
							// Belt-and-suspenders: the API is scoped to Avatar outfits,
							// but re-filter so DynamicHead / bundle costume previews
							// (just a head/bundle image) never leak into the gallery.
							.filter((item) => item.outfitType === "Avatar")
							.map((item) => ({ id: item.id, name: item.name })),
					),
			}).catch(() => [] as CardOutfit[]),
			getOrSetCache({
				key: ["users", userId, "swiperProfile"],
				fn: () =>
					getProfileComponentsData({
						profileType: "User",
						profileId: userId.toString(),
						components: [{ component: "About" }, { component: "SocialLinks" }],
					}).then((res) => res.components),
			}).catch(() => undefined),
		]);

		return {
			friendsSince,
			mutuals: mutuals ?? [],
			createdDate: details?.created ? new Date(details.created) : undefined,
			previousUsernames: profile?.About?.nameHistory ?? [],
			outfits,
			socialLinks: toSocialLinks(profile?.SocialLinks),
		};
	}, [userId, enabled]);
}
