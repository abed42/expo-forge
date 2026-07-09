import { SymbolView } from "expo-symbols";
import { TextInput, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

type SearchFieldProps = {
	value: string;
	onChangeText: (text: string) => void;
	placeholder?: string;
	autoFocus?: boolean;
	onSubmitEditing?: () => void;
};

/**
 * Full-radius search field — monochrome fill, leading magnifying glass.
 * Controlled: parent owns the query string.
 */
export function SearchField({
	value,
	onChangeText,
	placeholder = "Search",
	autoFocus = false,
	onSubmitEditing,
}: SearchFieldProps) {
	const { theme } = useUnistyles();

	return (
		<View style={styles.field}>
			<SymbolView
				name="magnifyingglass"
				size={16}
				tintColor={theme.colors.secondary}
			/>
			<TextInput
				autoCapitalize="none"
				autoCorrect={false}
				autoFocus={autoFocus}
				clearButtonMode="while-editing"
				onChangeText={onChangeText}
				onSubmitEditing={onSubmitEditing}
				placeholder={placeholder}
				placeholderTextColor={theme.colors.secondary}
				returnKeyType="search"
				style={styles.input}
				value={value}
			/>
		</View>
	);
}

const styles = StyleSheet.create((theme) => ({
	field: {
		alignItems: "center",
		alignSelf: "stretch",
		backgroundColor: theme.colors.fill,
		borderRadius: theme.radius.pill,
		flexDirection: "row",
		gap: theme.gap(1),
		minHeight: 44,
		paddingHorizontal: theme.gap(2),
		width: "100%",
	},
	input: {
		...theme.type.body,
		color: theme.colors.ink,
		flex: 1,
		paddingVertical: theme.gap(1.25),
	},
}));
