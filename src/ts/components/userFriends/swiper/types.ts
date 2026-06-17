import type { MutualFriendData } from "src/ts/utils/friends";

export type SwiperFriend = {
	userId: number;
	combinedName: string;
	username: string;
	isVerified: boolean;
};

export type MutualsControl = {
	open: (anchor: DOMRect, mutuals: MutualFriendData[], pinned: boolean) => void;
	scheduleClose: () => void;
};
