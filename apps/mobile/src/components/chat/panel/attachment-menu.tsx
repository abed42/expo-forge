import { Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { MENU, MENU_HEIGHT, PANEL_CONTENT } from "../constants";
import { Icon, type IconName } from "../icon";

export type MenuAction = "camera" | "photos" | "files" | "plugins" | "think";

interface MenuItem {
	action: MenuAction;
	label: string;
	icon: IconName;
}

const ITEMS: MenuItem[] = [
	{ action: "camera", label: "Camera", icon: "camera" },
	{ action: "photos", label: "Photos", icon: "photos" },
	{ action: "files", label: "Files", icon: "paperclip" },
	{ action: "plugins", label: "Plugins", icon: "plugins" },
	{ action: "think", label: "Think harder", icon: "gauge" },
];

interface AttachmentMenuProps {
	onSelect: (action: MenuAction) => void;
}

/**
 * The five rows that live inside the panel while it is still menu-shaped. It
 * has no background of its own — the panel owns the glass — and no size logic,
 * because the panel scales it.
 */
export function AttachmentMenu({ onSelect }: AttachmentMenuProps) {
	return (
		<View style={styles.root}>
			{ITEMS.map((item) => (
				<Pressable
					key={item.action}
					accessibilityRole="button"
					accessibilityLabel={item.label}
					onPress={() => onSelect(item.action)}
					style={styles.row}
				>
					<View style={styles.well}>
						<Icon
							name={item.icon}
							size={MENU.iconSize}
							color={styles.label.color}
						/>
					</View>
					<Text style={styles.label}>{item.label}</Text>
				</Pressable>
			))}
		</View>
	);
}

const styles = StyleSheet.create((theme) => ({
	root: {
		...PANEL_CONTENT,
		width: MENU.width,
		height: MENU_HEIGHT,
		paddingVertical: MENU.paddingVertical,
	},
	row: {
		height: MENU.itemHeight,
		flexDirection: "row",
		alignItems: "center",
		paddingLeft: MENU.iconInset,
	},
	well: {
		width: MENU.iconWell,
		height: MENU.iconWell,
		borderRadius: MENU.iconWell / 2,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: theme.colors.chat.iconWell,
	},
	label: {
		marginLeft: MENU.labelGap,
		color: theme.colors.chat.text,
		fontSize: MENU.labelSize,
		letterSpacing: -0.2,
	},
}));
