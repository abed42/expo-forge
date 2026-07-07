// This placeholder keeps the package type-safe until `pnpm --filter @repo/backend gen-types` regenerates it.
export type Database = {
	public: {
		Tables: Record<string, never>;
		Views: Record<string, never>;
		Functions: Record<string, never>;
		Enums: Record<string, never>;
		CompositeTypes: Record<string, never>;
	};
};
