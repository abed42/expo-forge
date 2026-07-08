#!/usr/bin/env node
import { parseArgs } from "node:util";

// next-forge pattern: this file compiles to dist/index.js and is the only
// artifact published to npm. The template itself is fetched from GitHub at
// init time, never bundled.

const HELP = `
  ∧ expo-forge — production-grade template for Expo apps

  Usage:
    bun create expo-forge [name]     scaffold a new app (coming soon)
    create-expo-forge init [name]

  The init wizard is under active development. Until it ships:
    git clone https://github.com/abed42/expo-forge.git

  Docs: https://expo-forge.com
`;

function main() {
	const { positionals } = parseArgs({ allowPositionals: true, strict: false });
	const command = positionals[0];

	if (command === "init") {
		console.log(HELP);
		console.log("  init is not implemented yet — watch the repo for v0.1.\n");
		return;
	}

	console.log(HELP);
}

main();
