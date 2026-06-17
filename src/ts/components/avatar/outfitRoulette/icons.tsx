// Inline line-icons for the Outfit Roulette panel. All use `currentColor` so the
// surrounding CSS (theme tokens) drives their color.

type IconProps = {
	className?: string;
	size?: number;
};

export function DiceIcon({ className, size = 18 }: IconProps) {
	return (
		<svg
			className={className}
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<rect x="3" y="3" width="18" height="18" rx="4.5" />
			<circle cx="8.5" cy="8.5" r="1.35" fill="currentColor" stroke="none" />
			<circle cx="15.5" cy="8.5" r="1.35" fill="currentColor" stroke="none" />
			<circle cx="12" cy="12" r="1.35" fill="currentColor" stroke="none" />
			<circle cx="8.5" cy="15.5" r="1.35" fill="currentColor" stroke="none" />
			<circle cx="15.5" cy="15.5" r="1.35" fill="currentColor" stroke="none" />
		</svg>
	);
}

export function LockClosedIcon({ className, size = 14 }: IconProps) {
	return (
		<svg
			className={className}
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
			<path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
		</svg>
	);
}

export function LockOpenIcon({ className, size = 14 }: IconProps) {
	return (
		<svg
			className={className}
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
			<path d="M8 10.5V7a4 4 0 0 1 7.7-1.6" />
		</svg>
	);
}

export function CheckIcon({ className, size = 14 }: IconProps) {
	return (
		<svg
			className={className}
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2.4}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M20 6 9 17l-5-5" />
		</svg>
	);
}

export function ChevronIcon({ className, size = 14 }: IconProps) {
	return (
		<svg
			className={className}
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2.2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="m6 9 6 6 6-6" />
		</svg>
	);
}

export function SlidersIcon({ className, size = 14 }: IconProps) {
	return (
		<svg
			className={className}
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
		</svg>
	);
}

export function MinusIcon({ className, size = 14 }: IconProps) {
	return (
		<svg
			className={className}
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2.4}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M5 12h14" />
		</svg>
	);
}

export function PlusIcon({ className, size = 14 }: IconProps) {
	return (
		<svg
			className={className}
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2.4}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M12 5v14M5 12h14" />
		</svg>
	);
}
