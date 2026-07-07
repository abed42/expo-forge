import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export default function ProfileScreen() {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>Profile</Text>
		</View>
	);
}

const styles = StyleSheet.create((theme) => ({
	container: {
		alignItems: "center",
		backgroundColor: theme.colors.surface,
		flex: 1,
		justifyContent: "center",
	},
	title: {
		...theme.type.largeTitle,
		color: theme.colors.ink,
	},
}));
