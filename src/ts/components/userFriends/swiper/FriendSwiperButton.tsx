import { render } from "preact";
import { getMessage } from "src/ts/helpers/i18n/getMessage";
import Button from "../../core/Button";
import FriendSwiperOverlay from "./FriendSwiperOverlay";

export type FriendSwiperButtonProps = {
	userId: number;
	isMyProfile: boolean;
};

export default function FriendSwiperButton({ userId, isMyProfile }: FriendSwiperButtonProps) {
	if (!isMyProfile) {
		return null;
	}

	const openSwiper = () => {
		const container = document.createElement("div");
		container.className = "roseal-friends-swiper-root";
		document.body.appendChild(container);

		const close = () => {
			render(null, container);
			container.remove();
		};

		render(<FriendSwiperOverlay userId={userId} onClose={close} />, container);
	};

	return (
		<Button
			type="secondary"
			size="sm"
			className="roseal-friends-swiper-button"
			onClick={openSwiper}
		>
			{getMessage("friendsSwiper.button")}
		</Button>
	);
}
