import { Button, IconButton } from "@repo/design-system";
import {
	type NativeStackNavigationProp,
	Stack,
	useNavigation,
	useRouter,
} from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { Platform, Share, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

const isIOS = Platform.OS === "ios";

// Presented as a formSheet (see root _layout): detents [0.6, 1.0], grabber
// visible, drag between half and full height or swipe down to dismiss.
const SHEET_FACTS = [
	{ label: "Presentation", value: "formSheet" },
	{ label: "Detents", value: "0.6 → 1.0" },
	{ label: "Grabber", value: "Visible" },
	{ label: "Toolbar", value: isIOS ? "Native, bottom" : "iOS only" },
] as const;

export default function ShowcaseSheetScreen() {
	const router = useRouter();
	// ParamListBase shape — expo-router vendors react-navigation, so the
	// param list type isn't re-exported; the structural form is identical.
	const navigation =
		useNavigation<
			NativeStackNavigationProp<Record<string, object | undefined>>
		>();
	const { theme } = useUnistyles();
	const [pinned, setPinned] = useState(false);

	// Native toolbars configured mid-presentation render blank items
	// (expo/expo#44493) — mount the bottom toolbar only after the sheet's
	// present transition settles, with a timer fallback.
	const [toolbarReady, setToolbarReady] = useState(false);
	useEffect(() => {
		const unsubscribe = navigation.addListener("transitionEnd", () =>
			setToolbarReady(true),
		);
		const timer = setTimeout(() => setToolbarReady(true), 900);
		return () => {
			unsubscribe();
			clearTimeout(timer);
		};
	}, [navigation]);

	const share = () => {
		void Share.share({ message: "Built with expo-forge" });
	};

	return (
		<View style={styles.screen}>
			{isIOS ? (
				<Stack.Toolbar placement="right">
					<Stack.Toolbar.Button
						icon="xmark"
						onPress={() => router.back()}
						tintColor={theme.colors.ink}
					/>
				</Stack.Toolbar>
			) : null}
			{isIOS && toolbarReady ? (
				<Stack.Toolbar placement="bottom">
					<Stack.Toolbar.Button
						icon="square.and.arrow.up"
						onPress={share}
						tintColor={theme.colors.ink}
					/>
					<Stack.Toolbar.Menu icon="ellipsis" tintColor={theme.colors.ink}>
						<Stack.Toolbar.MenuAction
							icon="pin"
							isOn={pinned}
							onPress={() => setPinned((value) => !value)}
						>
							Pin
						</Stack.Toolbar.MenuAction>
						<Stack.Toolbar.MenuAction
							icon="pencil"
							subtitle="Rename this drawer"
							onPress={() => undefined}
						>
							Rename
						</Stack.Toolbar.MenuAction>
						<Stack.Toolbar.MenuAction
							destructive
							icon="trash"
							onPress={() => router.back()}
						>
							Delete
						</Stack.Toolbar.MenuAction>
					</Stack.Toolbar.Menu>
					<Stack.Toolbar.Spacer />
					<Stack.Toolbar.Button
						onPress={() => router.back()}
						variant="prominent"
					>
						Done
					</Stack.Toolbar.Button>
				</Stack.Toolbar>
			) : null}

			<View style={styles.topBar}>
				<Text style={styles.title}>Drawer</Text>
				{isIOS ? null : (
					<IconButton accessibilityLabel="Close" onPress={() => router.back()}>
						<SymbolView name="xmark" size={15} tintColor={theme.colors.ink} />
					</IconButton>
				)}
			</View>
			<Text style={styles.subtitle}>
				A native sheet from expo-router — no gesture library, no reimplemented
				drawer. Drag the grabber to snap between detents; the bar below is a
				real UIToolbar with a native menu.
			</Text>

			<View style={styles.facts}>
				{SHEET_FACTS.map((fact, index) => (
					<View
						key={fact.label}
						style={[styles.factRow, index > 0 ? styles.factRowBorder : null]}
					>
						<Text style={styles.factLabel}>{fact.label}</Text>
						<Text style={styles.factValue}>
							{fact.label === "Toolbar" && pinned ? "Pinned ✓" : fact.value}
						</Text>
					</View>
				))}
			</View>

			{isIOS ? null : <Button label="Done" onPress={() => router.back()} />}
		</View>
	);
}

const styles = StyleSheet.create((theme) => ({
	screen: {
		backgroundColor: theme.colors.surface,
		flex: 1,
		gap: theme.gap(2),
		padding: theme.gap(3),
	},
	topBar: {
		alignItems: "center",
		flexDirection: "row",
		justifyContent: "space-between",
		minHeight: 32,
	},
	title: {
		...theme.type.title,
		color: theme.colors.ink,
	},
	subtitle: {
		...theme.type.body,
		color: theme.colors.secondary,
	},
	facts: {
		backgroundColor: theme.colors.fill,
		borderCurve: "continuous",
		borderRadius: theme.radius.card,
		paddingHorizontal: theme.gap(2),
	},
	factRow: {
		alignItems: "center",
		flexDirection: "row",
		justifyContent: "space-between",
		minHeight: 48,
	},
	factRowBorder: {
		borderTopColor: theme.colors.border,
		borderTopWidth: 1,
	},
	factLabel: {
		...theme.type.body,
		color: theme.colors.ink,
	},
	factValue: {
		...theme.type.body,
		color: theme.colors.secondary,
	},
}));
