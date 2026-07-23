import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useUnistyles } from "react-native-unistyles";

// Two grouped tabs — no role="search" trigger, so the liquid-glass bar sits
// as a single centered island. Search lives at the top of Home instead.
export default function TabsLayout() {
	// Grayscale design: selected tab tints ink, not the system blue.
	const { theme } = useUnistyles();

	return (
		<NativeTabs tintColor={theme.colors.ink}>
			<NativeTabs.Trigger name="index">
				<NativeTabs.Trigger.Icon
					md="home"
					sf={{ default: "house", selected: "house.fill" }}
				/>
				<NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
			</NativeTabs.Trigger>
			<NativeTabs.Trigger name="showcase">
				<NativeTabs.Trigger.Icon
					md="auto_awesome"
					sf={{ default: "sparkles", selected: "sparkles" }}
				/>
				<NativeTabs.Trigger.Label>Showcase</NativeTabs.Trigger.Label>
			</NativeTabs.Trigger>
			<NativeTabs.Trigger name="profile">
				<NativeTabs.Trigger.Icon
					md="person"
					sf={{ default: "person", selected: "person.fill" }}
				/>
				<NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
			</NativeTabs.Trigger>
		</NativeTabs>
	);
}
