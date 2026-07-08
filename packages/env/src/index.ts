import { z } from "zod";

type AnyZodObject = z.ZodObject<z.ZodRawShape>;

type MergeShapes<
	Schemas extends readonly AnyZodObject[],
	Accumulated extends z.ZodRawShape = Record<never, never>,
> = Schemas extends readonly [
	infer Head extends AnyZodObject,
	...infer Tail extends readonly AnyZodObject[],
]
	? MergeShapes<Tail, Accumulated & Head["shape"]>
	: Accumulated;

type MergeSchema<Schemas extends readonly AnyZodObject[]> = z.ZodObject<
	MergeShapes<Schemas>
>;

type ComposeEnvResult<Schemas extends readonly AnyZodObject[]> = z.infer<
	MergeSchema<Schemas>
>;

// Cache is keyed by the identity of the schema tuple, not module-global.
// A single global cache was a footgun: the second composeEnv call with a
// DIFFERENT schema set would silently return the first call's result —
// skipping validation of its own variables entirely. Keying by schema
// identity keeps the "parse once" behavior for repeated identical calls
// (schemas are module-level constants) while different compositions each
// get their own validated result.
const schemaIds = new WeakMap<AnyZodObject, number>();
let nextSchemaId = 0;
const cachedEnvs = new Map<string, unknown>();

function cacheKeyFor(schemas: readonly AnyZodObject[]): string {
	return schemas
		.map((schema) => {
			let id = schemaIds.get(schema);
			if (id === undefined) {
				id = nextSchemaId++;
				schemaIds.set(schema, id);
			}
			return id;
		})
		.join(",");
}

function mergeSchemas<Schemas extends readonly AnyZodObject[]>(
	schemas: Schemas,
): MergeSchema<Schemas> {
	const mergedShape: z.ZodRawShape = {};

	for (const schema of schemas) {
		Object.assign(mergedShape, schema.shape);
	}

	return z.object(mergedShape) as MergeSchema<Schemas>;
}

function formatEnvError(error: z.ZodError): string {
	const prettyMessage = z.prettifyError(error).trim();

	if (prettyMessage.length > 0) {
		return prettyMessage;
	}

	return error.issues
		.map((issue) => {
			const issuePath = issue.path.join(".") || "process.env";
			return `- ${issuePath}: ${issue.message}`;
		})
		.join("\n");
}

export function composeEnv<Schemas extends readonly AnyZodObject[]>(
	...schemas: Schemas
): ComposeEnvResult<Schemas> {
	if (process.env.EXPO_PUBLIC_SKIP_ENV_VALIDATION === "true") {
		// Validation is explicitly disabled, so we trust the caller's schemas and cast the raw env object.
		return process.env as unknown as ComposeEnvResult<Schemas>;
	}

	const cacheKey = cacheKeyFor(schemas);

	if (cachedEnvs.has(cacheKey)) {
		return cachedEnvs.get(cacheKey) as ComposeEnvResult<Schemas>;
	}

	const mergedSchema = mergeSchemas(schemas);
	const result = mergedSchema.safeParse(process.env);

	if (!result.success) {
		throw new Error(
			`Invalid environment variables:\n${formatEnvError(result.error)}`,
		);
	}

	// Metro only statically inlines member expressions like process.env.EXPO_PUBLIC_FOO in app code.
	// This whole-object parse is for validation; runtime consumers should still read EXPO_PUBLIC_* via static member access.
	cachedEnvs.set(cacheKey, result.data);
	return result.data as ComposeEnvResult<Schemas>;
}
