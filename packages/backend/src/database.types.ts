// This placeholder keeps the package type-safe until `bun run gen-types` (in packages/backend) regenerates it.
export type Database = {
	public: {
		Tables: Record<string, never>;
		Views: Record<string, never>;
		Functions: Record<string, never>;
		Enums: Record<string, never>;
		CompositeTypes: Record<string, never>;
	};
};
