import { type SFSymbol, SymbolView } from "expo-symbols";

/**
 * The glyphs the chat surface uses, named by role. The motion reference ships
 * its own SVG icon font; here they map onto SF Symbols, the same way the rest
 * of the app draws its icons.
 */
const GLYPHS = {
	plus: "plus",
	mic: "mic",
	send: "arrow.up",
	stop: "stop.fill",
	voice: "waveform",
	close: "xmark",
	camera: "camera",
	photos: "photo.on.rectangle",
	paperclip: "paperclip",
	plugins: "puzzlepiece.extension",
	gauge: "gauge.with.needle",
	"chevron-left": "chevron.left",
	"camera-flip": "arrow.triangle.2.circlepath.camera",
	flash: "bolt.fill",
	"flash-off": "bolt.slash",
	ellipsis: "ellipsis",
	sparkles: "sparkles",
	compose: "square.and.pencil",
} as const satisfies Record<string, SFSymbol>;

export type IconName = keyof typeof GLYPHS;

interface IconProps {
	name: IconName;
	size: number;
	color: string;
}

export function Icon({ name, size, color }: IconProps) {
	return (
		<SymbolView
			name={GLYPHS[name]}
			size={size}
			tintColor={color}
			weight="medium"
		/>
	);
}
