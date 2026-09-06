import type { ViewStyle } from "react-native";
import { Easing } from "react-native-reanimated";

/**
 * Geometry for the ChatGPT composer + attachment sheet, ported from
 * react-native-motion's "chatgpt-attachments". Every number was measured
 * frame by frame off a reference recording (1290×2796 @3x → 430×932pt) and
 * divided down to points — when a value looks oddly specific, that's why.
 * Colours live in the design-system theme under `colors.chat`.
 */

/** Side gutter shared by the composer, the menu and the photo grid. */
export const GUTTER = 12;

export const COMPOSER = {
	radius: 24,
	/** Row holding +, the field, the mic and the action button. */
	rowHeight: 48,
	/** Left padding of that row. */
	rowPaddingLeft: 14,
	/** Hit target the + glyph sits in the middle of. */
	plusHit: 30,
	/**
	 * Diameter of the circular well the menu grows out of. Nothing paints this
	 * circle while the sheet is shut; it is the panel's own shape at the very
	 * start of the open.
	 */
	plusWell: 34,
	/**
	 * Gap between the composer's bottom edge and the top of the keyboard. Only
	 * while the keyboard is up: at rest the composer sits right on the bottom
	 * safe-area inset (chat is a full-screen route, so no tab bar is under it).
	 */
	keyboardGap: 12,
	/** Padding above the attachment strip, once there is one. */
	stripPaddingTop: 8,
	/** Gap between the attachment strip and the text row. */
	stripGap: 7,
	thumbSize: 115,
	thumbRadius: 18,
	thumbGap: 7,
	/** Diameter of the ✕ badge sitting inside each thumbnail. */
	removeBadge: 17,
	removeBadgeInset: 6,
	/** White circular voice / send button. */
	actionSize: 30,
	plusSize: 20,
	/**
	 * How far right the + glyph slides to clear the space the menu grows out
	 * of — about the glyph's own width, so it reads as moving aside.
	 */
	plusSlide: 16,
	micSize: 20,
	fieldSize: 17,
} as const;

/** Window X of the + button's centre — where the panel's circle is anchored. */
export const PLUS_CENTER_X =
	GUTTER + COMPOSER.rowPaddingLeft + COMPOSER.plusHit / 2;

/** Height the attachment strip adds to the composer: 8 + 115 + 7. */
export const COMPOSER_STRIP_HEIGHT =
	COMPOSER.stripPaddingTop + COMPOSER.thumbSize + COMPOSER.stripGap;

export const MENU = {
	width: 280,
	itemHeight: 66,
	paddingVertical: 12,
	/** Fitted from the reference's corner profile — a near-squircle. */
	radius: 46,
	iconWell: 42,
	iconSize: 22,
	/** Icon well inset from the panel's left edge. */
	iconInset: 24,
	labelGap: 18,
	labelSize: 19,
	/** The menu's centre sits this far below the + button's centre. */
	centerOffset: 7,
} as const;

export const MENU_ITEMS = 5;
export const MENU_HEIGHT =
	MENU.itemHeight * MENU_ITEMS + MENU.paddingVertical * 2;

export const GRID = {
	columns: 3,
	/** Hairline of the sheet showing between the cells. */
	gap: 1.5,
	/** Each cell's own corner radius — a softened edge, not a rounded tile. */
	cellRadius: 2,
	/** Corner radius of the sheet once it has become the grid. */
	panelRadius: 52,
	/** Selection badge: a blue disc inside a white ring, bottom-right. */
	badgeSize: 23,
	badgeRing: 2,
	badgeInset: 4,
	badgeLabelSize: 14,
} as const;

export const BOTTOM_BAR = {
	/** Inset from the sheet's own edge, the same on all three sides. */
	inset: 25,
	/** Diameter of the round glass controls in the bar. */
	controlSize: 46,
	backIcon: 22,
	pillHeight: 43,
	pillPaddingHorizontal: 22,
	pillLabelSize: 17,
} as const;

export const CAMERA = {
	/** The shutter: a white disc inside a ring of glass. */
	shutterSize: 68,
	shutterPadding: 4,
	optionIcon: 22,
	/** Gap between stacked options once the ⋯ has unfolded. */
	optionGap: 10,
	/**
	 * How small an option starts when it comes out of the ⋯ button. Not zero:
	 * glass at zero size has nothing to refract.
	 */
	optionStartScale: 0.35,
	/** JPEG quality handed to `takePictureAsync`. */
	quality: 0.85,
} as const;

/** Opacity is the one thing still driven by a curve; everything that moves is a spring. */
export const EASE_FADE = Easing.out(Easing.quad);

/** Kept for the blur pulse, which wants a quart's hard front edge. */
export const EASE_OUT = Easing.out(Easing.poly(4));

/**
 * Reanimated's perceptual-duration springs — the same pair of numbers as
 * SwiftUI's `Spring(duration:bounce:)` with `dampingRatio` = 1 − bounce.
 */
export const SPRING = {
	/** The panel opening, morphing and collapsing. 0.8 ≈ 4pt of overshoot on the menu. */
	panel: { duration: 400, dampingRatio: 0.8 },
	/** The same spring without the bounce, for the way back into the + button. */
	panelOut: { duration: 400, dampingRatio: 1 },
	/** Grid → the thumbnail's slot in the composer. */
	attach: { duration: 400 },
	/** The composer growing around the attachment strip. */
	strip: { duration: 400 },
	/** Selection badge pop. */
	badge: { duration: 400 },
	/** The confirm capsule resizing as its label grows. */
	pill: { duration: 400 },
} as const;

/** Lengths for the things that cannot take a spring. */
export const DURATION = {
	/** Tracks `SPRING.panel.duration` — the material is told this in ms. */
	panel: SPRING.panel.duration,
	attach: 340,
	/** Content crossfade inside the morphing panel. */
	crossfade: 150,
	/** Blur ramp layered over the crossfade. */
	blur: 160,
	/** "All Photos" ⇄ "Add N photos". */
	pill: 160,
	/** How long the + glyph gets to itself before the panel arrives. */
	plusLead: 30,
} as const;

/**
 * The layout contract between the panel and everything it shows: laid out at
 * natural size, anchored top-left, and scaled from there through the morph.
 */
export const PANEL_CONTENT = {
	position: "absolute",
	left: 0,
	top: 0,
	transformOrigin: "top left",
} as const satisfies ViewStyle;

/**
 * Window Y of the sheet's top edge, given the composer's bottom and the
 * lowest Y the menu may reach. Computed in exactly one place because the
 * panel, the grid and the flights all agree on it.
 *
 * The menu is centred on the + button, which is where the reference has it
 * with the keyboard up. With the keyboard down the composer is at the very
 * bottom, so that centre would put the last rows off screen; the menu is
 * pushed up until it ends at `floor` instead.
 */
export function sheetTopFromComposerBottom(bottom: number, floor: number) {
	"worklet";
	const centred =
		bottom - COMPOSER.rowHeight / 2 + MENU.centerOffset - MENU_HEIGHT / 2;
	return Math.min(centred, floor - MENU_HEIGHT);
}

/** A rect, in window coordinates unless the field it sits on says otherwise. */
export interface Frame {
	x: number;
	y: number;
	w: number;
	h: number;
}

/** Linear interpolation, on the UI thread. */
export function mix(t: number, a: number, b: number) {
	"worklet";
	return a + (b - a) * t;
}
