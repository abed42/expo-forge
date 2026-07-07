import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export default function HomeScreen() {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>Home</Text>
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
