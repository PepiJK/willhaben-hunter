/* eslint-disable @typescript-eslint/no-explicit-any */
import { exec } from "child_process";
import { promisify } from "util";
import { describe, expect, it } from "vitest";

const execAsync = promisify(exec);
const CLI_CMD = "npx ts-node src/cli.ts";

async function runCLI(command: string, args: string[]) {
	try {
		const { stdout, stderr } = await execAsync(`${CLI_CMD} ${command} ${args.join(" ")}`);
		return { stdout, stderr, error: null };
	} catch (error: any) {
		return { stdout: error.stdout, stderr: error.stderr, error };
	}
}

describe("CLI E2E Tests", () => {
	const TIMEOUT = 120000;

	describe("Marketplace CLI", () => {
		it(
			"should fetch 1 item with details as JSON and log spinners",
			async () => {
				const { stdout, stderr, error } = await runCLI("marketplace", [
					"--query iphone",
					"--price-min 10",
					"--price-max 1000",
					"--area wien",
					"--wien-districts 1",
					"--limit 1",
					"--format json",
					"--non-interactive",
				]);
				expect(error).toBeNull();

				const data = JSON.parse(stdout);
				expect(Array.isArray(data)).toBe(true);
				expect(data.length).toBeGreaterThan(0);
				expect(data.length).toBeLessThanOrEqual(1);
				expect(data[0].id).toBeDefined();
				expect(data[0].title).toBeDefined();
				expect(data[0].price).toBeDefined();
				expect(data[0].description).toBeDefined(); // Details fetched

				expect(stderr).toMatch(/Successfully scraped/);
			},
			TIMEOUT,
		);

		it(
			"should fetch 1 item with details as CSV",
			async () => {
				const { stdout, error } = await runCLI("marketplace", [
					"--query monitor",
					"--limit 1",
					"--format csv",
					"--non-interactive",
				]);
				expect(error).toBeNull();

				expect(stdout).toContain("ID,");
				expect(stdout.split("\n").length).toBeGreaterThanOrEqual(2);
			},
			TIMEOUT,
		);

		it(
			"should handle fail-on-empty with error code",
			async () => {
				const { error } = await runCLI("marketplace", [
					"--query THIS_WILL_NEVER_EXIST_12345",
					"--limit 1",
					"--fail-on-empty",
					"--non-interactive",
				]);
				expect(error).not.toBeNull();
				expect(error?.code).toBe(1);
			},
			TIMEOUT,
		);
	});

	describe("Jobs CLI", () => {
		it(
			"should fetch 1 item with details as JSON and log spinners",
			async () => {
				const { stdout, stderr, error } = await runCLI("jobs", [
					"--query developer",
					"--area wien",
					"--limit 1",
					"--format json",
					"--non-interactive",
				]);
				expect(error).toBeNull();

				const data = JSON.parse(stdout);
				expect(Array.isArray(data)).toBe(true);
				expect(data.length).toBeGreaterThan(0);
				expect(data.length).toBeLessThanOrEqual(1);
				expect(data[0].id).toBeDefined();
				expect(data[0].title).toBeDefined();
				expect(data[0].description).toBeDefined(); // Details fetched

				expect(stderr).toMatch(/Successfully scraped \d+ job listings!/);
			},
			TIMEOUT,
		);

		it(
			"should fetch 1 item with details as CSV",
			async () => {
				const { stdout, error } = await runCLI("jobs", [
					"--query manager",
					"--limit 1",
					"--format csv",
					"--non-interactive",
				]);
				expect(error).toBeNull();

				expect(stdout).toContain("ID,");
				expect(stdout.split("\n").length).toBeGreaterThanOrEqual(2);
			},
			TIMEOUT,
		);

		it(
			"should handle fail-on-empty with error code",
			async () => {
				const { error } = await runCLI("jobs", [
					"--query THIS_WILL_NEVER_EXIST_12345",
					"--limit 1",
					"--fail-on-empty",
					"--non-interactive",
				]);
				expect(error).not.toBeNull();
				expect(error?.code).toBe(1);
			},
			TIMEOUT,
		);
	});

	describe("Immo CLI", () => {
		it(
			"should fetch 1 item with details as JSON and log spinners",
			async () => {
				const { stdout, stderr, error } = await runCLI("immo", [
					"--type wohnung-mieten",
					"--rooms 2",
					"--size-min 40",
					"--limit 1",
					"--format json",
					"--non-interactive",
				]);
				expect(error).toBeNull();

				const data = JSON.parse(stdout);
				expect(Array.isArray(data)).toBe(true);
				expect(data.length).toBeGreaterThan(0);
				expect(data.length).toBeLessThanOrEqual(1);
				expect(data[0].id).toBeDefined();
				expect(data[0].title).toBeDefined();
				expect(data[0].price).toBeDefined();
				expect(data[0].description).toBeDefined(); // Details fetched

				expect(stderr).toMatch(/Successfully scraped/);
			},
			TIMEOUT,
		);

		it(
			"should fetch 1 item with details as CSV",
			async () => {
				const { stdout, error } = await runCLI("immo", [
					"--type wohnung-kaufen",
					"--limit 1",
					"--format csv",
					"--non-interactive",
				]);
				expect(error).toBeNull();

				expect(stdout).toContain("ID,");
				expect(stdout.split("\n").length).toBeGreaterThanOrEqual(2);
			},
			TIMEOUT,
		);

		it(
			"should handle fail-on-empty with error code",
			async () => {
				const { error } = await runCLI("immo", [
					"--query THIS_WILL_NEVER_EXIST_12345",
					"--type haus-kaufen",
					"--price-min 1",
					"--price-max 2",
					"--limit 1",
					"--fail-on-empty",
					"--non-interactive",
				]);
				expect(error).not.toBeNull();
				expect(error?.code).toBe(1);
			},
			TIMEOUT,
		);
	});
});
