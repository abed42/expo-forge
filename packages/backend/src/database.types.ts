// This placeholder keeps the package type-safe until `bun run gen-types` (in packages/backend) regenerates it.
// The table shapes below are hand-written mirrors of the shipped migrations
// (0002_clerk_rls.sql → profiles, 0003_feed_items.sql → feed_items) so typed
// queries work out of the box; regeneration replaces them with the live schema.
export type Database = {
	public: {
		Tables: {
			feed_items: {
				Row: {
					id: string;
					title: string;
					subtitle: string | null;
					image_url: string | null;
					created_at: string | null;
				};
				Insert: {
					id?: string;
					title: string;
					subtitle?: string | null;
					image_url?: string | null;
					created_at?: string | null;
				};
				Update: {
					id?: string;
					title?: string;
					subtitle?: string | null;
					image_url?: string | null;
					created_at?: string | null;
				};
				Relationships: [];
			};
			profiles: {
				Row: {
					id: string;
					email: string | null;
					full_name: string | null;
					avatar_url: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id: string;
					email?: string | null;
					full_name?: string | null;
					avatar_url?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					email?: string | null;
					full_name?: string | null;
					avatar_url?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
		};
		Views: Record<string, never>;
		Functions: Record<string, never>;
		Enums: Record<string, never>;
		CompositeTypes: Record<string, never>;
	};
};
