import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type WithElementRef<T> = T & {
	ref?: HTMLElement | null;
};

export type WithoutChildrenOrChild<T> = Omit<T, "children" | "child">;

/**
 * Converts a hex color string to an rgba string.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Math utilities for 2D vectors.
 */
export const Vector = {
  add: (v1: { x: number, y: number }, v2: { x: number, y: number }) => ({ x: v1.x + v2.x, y: v1.y + v2.y }),
  sub: (v1: { x: number, y: number }, v2: { x: number, y: number }) => ({ x: v1.x - v2.x, y: v1.y - v2.y }),
  distance: (v1: { x: number, y: number }, v2: { x: number, y: number }) => {
    const dx = v1.x - v2.x;
    const dy = v1.y - v2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
};

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
