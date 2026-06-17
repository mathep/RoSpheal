import type { JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

export type SwipeDirection = "left" | "right";

export type UseSwipeGestureOptions = {
	onSwipe: (direction: SwipeDirection) => void;
	onTap?: (zone: "left" | "right") => void;
	threshold?: number;
	enabled?: boolean;
};

const EXIT_DURATION_MS = 250;
const EXIT_DISTANCE = 1000;
// Pointer travel under this (px) on release counts as a tap, not a drag.
const TAP_THRESHOLD = 10;

/**
 * Tinder-style swipe gesture for a single card. Tracks pointer drag, applies a
 * translate + rotate transform, and fires `onSwipe` once the card is dragged
 * past `threshold` (or `triggerExit` is called by an external button).
 */
export default function useSwipeGesture({
	onSwipe,
	onTap,
	threshold = 120,
	enabled = true,
}: UseSwipeGestureOptions) {
	const startRef = useRef<{ x: number; y: number } | null>(null);
	const draggingRef = useRef(false);
	const mountedRef = useRef(true);
	const exitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
	const [exiting, setExiting] = useState<SwipeDirection | null>(null);

	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
			if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
		};
	}, []);

	const triggerExit = (direction: SwipeDirection) => {
		if (exiting || exitTimeoutRef.current) return;
		draggingRef.current = false;
		startRef.current = null;
		setExiting(direction);
		exitTimeoutRef.current = setTimeout(() => {
			exitTimeoutRef.current = null;
			onSwipe(direction);
			if (mountedRef.current) {
				setExiting(null);
				setOffset({ x: 0, y: 0 });
			}
		}, EXIT_DURATION_MS);
	};

	const onPointerDown = (e: JSX.TargetedPointerEvent<HTMLDivElement>) => {
		if (!enabled || exiting) return;
		draggingRef.current = true;
		startRef.current = { x: e.clientX, y: e.clientY };
		try {
			e.currentTarget.setPointerCapture(e.pointerId);
		} catch {}
	};

	const onPointerMove = (e: JSX.TargetedPointerEvent<HTMLDivElement>) => {
		if (!draggingRef.current || !startRef.current) return;
		setOffset({
			x: e.clientX - startRef.current.x,
			y: e.clientY - startRef.current.y,
		});
	};

	const onPointerUp = (e: JSX.TargetedPointerEvent<HTMLDivElement>) => {
		if (!draggingRef.current || !startRef.current) return;
		const dx = e.clientX - startRef.current.x;
		const dy = e.clientY - startRef.current.y;
		const rect = e.currentTarget.getBoundingClientRect();
		draggingRef.current = false;
		startRef.current = null;
		try {
			e.currentTarget.releasePointerCapture(e.pointerId);
		} catch {}

		if (dx <= -threshold) {
			triggerExit("left");
		} else if (dx >= threshold) {
			triggerExit("right");
		} else {
			setOffset({ x: 0, y: 0 });
			if (onTap && Math.abs(dx) < TAP_THRESHOLD && Math.abs(dy) < TAP_THRESHOLD) {
				onTap(e.clientX < rect.left + rect.width / 2 ? "left" : "right");
			}
		}
	};

	let transform: string;
	let transition: string;
	if (exiting) {
		const dir = exiting === "left" ? -1 : 1;
		transform = `translate(${dir * EXIT_DISTANCE}px, ${offset.y}px) rotate(${dir * 25}deg)`;
		transition = `transform ${EXIT_DURATION_MS}ms ease-out, opacity ${EXIT_DURATION_MS}ms ease-out`;
	} else if (draggingRef.current) {
		transform = `translate(${offset.x}px, ${offset.y}px) rotate(${offset.x * 0.05}deg)`;
		transition = "none";
	} else {
		transform = `translate(${offset.x}px, ${offset.y}px) rotate(${offset.x * 0.05}deg)`;
		transition = "transform 0.25s ease-out";
	}

	const style: JSX.CSSProperties = {
		transform,
		transition,
		opacity: exiting ? 0 : 1,
	};

	const offsetX = exiting ? (exiting === "left" ? -threshold : threshold) : offset.x;

	return {
		handlers: {
			onPointerDown,
			onPointerMove,
			onPointerUp,
			onPointerCancel: onPointerUp,
		},
		style,
		offsetX,
		exiting,
		triggerExit,
	};
}
