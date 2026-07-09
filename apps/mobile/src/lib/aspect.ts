/** Stable aspect ratios so masonry columns look uneven without layout thrash. */
const RATIOS = [0.72, 0.88, 1.05, 0.78, 1.2, 0.92] as const;

export function aspectFor(key: string | number): number {
	if (typeof key === "number") {
		return RATIOS[key % RATIOS.length] ?? 0.88;
	}
	let hash = 0;
	for (let i = 0; i < key.length; i++) {
		hash = (hash + key.charCodeAt(i) * (i + 1)) % RATIOS.length;
	}
	return RATIOS[hash] ?? 0.88;
}
