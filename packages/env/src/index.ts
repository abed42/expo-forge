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

let cachedEnv: unknown;
let hasCachedEnv = false;

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
	if (hasCachedEnv) {
		return cachedEnv as ComposeEnvResult<Schemas>;
	}

	if (process.env.EXPO_PUBLIC_SKIP_ENV_VALIDATION === "true") {
		// Validation is explicitly disabled, so we trust the caller's schemas and cast the raw env object once.
		cachedEnv = process.env as unknown as ComposeEnvResult<Schemas>;
		hasCachedEnv = true;
		return cachedEnv as ComposeEnvResult<Schemas>;
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
	cachedEnv = result.data;
	hasCachedEnv = true;
	return result.data as ComposeEnvResult<Schemas>;
}
