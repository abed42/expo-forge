import { useRouter } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useUnistyles } from "react-native-unistyles";

// Grouped tabs only — no role="search" trigger, so the liquid-glass bar sits
// as a single centered island. Search lives at the top of Home instead.
export default function TabsLayout() {
	// Grayscale design: selected tab tints ink, not the system blue.
	const { theme } = useUnistyles();
	const router = useRouter();

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
					md="dashboard"
					sf={{
						default: "rectangle.3.group",
						selected: "rectangle.3.group.fill",
					}}
				/>
				<NativeTabs.Trigger.Label>Showcase</NativeTabs.Trigger.Label>
			</NativeTabs.Trigger>
			{/* chat: remove this trigger along with `src/components/chat`. The tab
			    is an entry point only — `disabled` stops the native selection and
			    the press pushes the full-screen chat route over the tabs instead. */}
			<NativeTabs.Trigger
				disabled
				listeners={{ tabPress: () => router.push("/chat") }}
				name="chat-tab"
			>
				<NativeTabs.Trigger.Icon
					md="chat"
					sf={{
						default: "bubble.left.and.bubble.right",
						selected: "bubble.left.and.bubble.right.fill",
					}}
				/>
				<NativeTabs.Trigger.Label>Chat</NativeTabs.Trigger.Label>
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
