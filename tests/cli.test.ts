import { describe, expect, it, vi, beforeEach, afterEach, Mock } from "vitest";
import { CliApp } from "../src/cli/cli";
import * as inquirerPrompts from "@inquirer/prompts";
import { Area, SortOrder, ViennaDistrict } from "../src/scraper/scraper.const";

vi.mock("@inquirer/prompts", () => ({
	input: vi.fn(),
	checkbox: vi.fn(),
}));

describe("CliApp - Interactive Prompts & Inputs", () => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let app: any;

	beforeEach(() => {
		app = new CliApp();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should prompt for all missing inputs and parse them correctly", async () => {
		const inputMock = inquirerPrompts.input as Mock;
		const checkboxMock = inquirerPrompts.checkbox as Mock;

		inputMock
			.mockResolvedValueOnce("iphone") // query
			.mockResolvedValueOnce("100") // priceMin
			.mockResolvedValueOnce("500") // priceMax
			.mockResolvedValueOnce("10"); // limit

		checkboxMock
			.mockResolvedValueOnce([Area.WIEN]) // area
			.mockResolvedValueOnce([ViennaDistrict.INNERE_STADT]); // wienDistricts

		const result = await app._handleInteractivePrompts({});

		expect(result.query).toBe("iphone");
		expect(result.priceMin).toBe(100);
		expect(result.priceMax).toBe(500);
		expect(result.area).toEqual([Area.WIEN]);
		expect(result.wienDistricts).toEqual([ViennaDistrict.INNERE_STADT]);
		expect(result.limit).toBe(10);
	});

	it("should skip prompts if values are already provided via CLI flags", async () => {
		const result = await app._handleInteractivePrompts({
			query: "macbook",
			priceMin: 200,
			priceMax: 1000,
			area: [Area.KAERNTEN],
			limit: 5,
		});

		expect(inquirerPrompts.input).not.toHaveBeenCalled();
		expect(inquirerPrompts.checkbox).not.toHaveBeenCalled();
		expect(result.query).toBe("macbook");
		expect(result.priceMin).toBe(200);
		expect(result.priceMax).toBe(1000);
		expect(result.area).toEqual([Area.KAERNTEN]);
		expect(result.limit).toBe(5);
		expect(result.wienDistricts).toBeUndefined();
	});

	it("should handle empty/skipped inputs gracefully", async () => {
		const inputMock = inquirerPrompts.input as Mock;
		const checkboxMock = inquirerPrompts.checkbox as Mock;

		inputMock
			.mockResolvedValueOnce("laufband") // query
			.mockResolvedValueOnce("") // empty priceMin
			.mockResolvedValueOnce("   ") // empty priceMax
			.mockResolvedValueOnce(""); // empty limit

		checkboxMock.mockResolvedValueOnce([]); // empty area

		const result = await app._handleInteractivePrompts({});

		expect(result.query).toBe("laufband");
		expect(result.priceMin).toBeUndefined();
		expect(result.priceMax).toBeUndefined();
		expect(result.area).toBeUndefined();
		expect(result.wienDistricts).toBeUndefined();
		expect(result.limit).toBeUndefined();
	});

	it("should prompt for Vienna districts only if Wien is selected as area", async () => {
		const inputMock = inquirerPrompts.input as Mock;
		const checkboxMock = inquirerPrompts.checkbox as Mock;

		inputMock
			.mockResolvedValueOnce("fahrrad") // query
			.mockResolvedValueOnce("")
			.mockResolvedValueOnce("")
			.mockResolvedValueOnce("");

		checkboxMock
			.mockResolvedValueOnce([Area.WIEN]) // area is Wien
			.mockResolvedValueOnce([]); // User skipped specific districts

		const result = await app._handleInteractivePrompts({});

		expect(result.area).toEqual([Area.WIEN]);
		expect(result.wienDistricts).toBeUndefined(); // empty selection converts to undefined
		expect(inputMock).toHaveBeenCalledTimes(4);
		expect(checkboxMock).toHaveBeenCalledTimes(2);
	});

	describe("TTY and Interactive Modes", () => {
		let originalStdinTTY: boolean | undefined;
		let originalStdoutTTY: boolean | undefined;

		beforeEach(() => {
			originalStdinTTY = process.stdin.isTTY;
			originalStdoutTTY = process.stdout.isTTY;
			app._runScraperAndExport = vi.fn().mockResolvedValue(undefined);
		});

		afterEach(() => {
			process.stdin.isTTY = originalStdinTTY;
			process.stdout.isTTY = originalStdoutTTY;
		});

		it("should use interactive mode when both stdin and stdout are TTYs", async () => {
			process.stdin.isTTY = true;
			process.stdout.isTTY = true;
			app._handleInteractivePrompts = vi.fn().mockResolvedValue({ query: "interactive" });

			await app._executeSearchAction({});
			expect(app._handleInteractivePrompts).toHaveBeenCalled();
			expect(app._runScraperAndExport).toHaveBeenCalledWith(
				expect.objectContaining({ query: "interactive" }),
				expect.any(Object),
				expect.any(Object),
			);
		});

		it("should bypass interactive mode when stdin is not TTY (e.g., piped input)", async () => {
			process.stdin.isTTY = false;
			process.stdout.isTTY = true;
			app._handleInteractivePrompts = vi.fn();

			await app._executeSearchAction({ query: "piped in" });
			expect(app._handleInteractivePrompts).not.toHaveBeenCalled();
			expect(app._runScraperAndExport).toHaveBeenCalledWith(
				expect.objectContaining({ query: "piped in" }),
				expect.any(Object),
				expect.any(Object),
			);
		});

		it("should bypass interactive mode when stdout is not TTY (e.g., piped output)", async () => {
			process.stdin.isTTY = true;
			process.stdout.isTTY = false;
			app._handleInteractivePrompts = vi.fn();

			await app._executeSearchAction({ query: "piped out" });
			expect(app._handleInteractivePrompts).not.toHaveBeenCalled();
			expect(app._runScraperAndExport).toHaveBeenCalledWith(
				expect.objectContaining({ query: "piped out" }),
				expect.any(Object),
				expect.any(Object),
			);
		});

		it("should bypass interactive mode when --non-interactive flag is provided", async () => {
			process.stdin.isTTY = true;
			process.stdout.isTTY = true;
			app._handleInteractivePrompts = vi.fn();

			await app._executeSearchAction({
				query: "forced non-interactive",
				nonInteractive: true,
			});
			expect(app._handleInteractivePrompts).not.toHaveBeenCalled();
		});
	});

	it("should forward format and output options to _runScraperAndExport", async () => {
		app._runScraperAndExport = vi.fn().mockResolvedValue(undefined);

		const originalIsTTY = process.stdin.isTTY;
		process.stdin.isTTY = false;

		await app._executeSearchAction({
			query: "test",
			format: "csv",
			output: "results.csv",
		});

		expect(app._runScraperAndExport).toHaveBeenCalledWith(
			expect.objectContaining({ query: "test" }),
			expect.objectContaining({
				format: "csv",
				outputPath: "results.csv",
			}),
			expect.objectContaining({
				quiet: false,
				failOnEmpty: false,
			}),
		);

		process.stdin.isTTY = originalIsTTY;
	});

	it("should forward sort and skipDetails options to scrape options", async () => {
		app._runScraperAndExport = vi.fn().mockResolvedValue(undefined);

		const originalIsTTY = process.stdin.isTTY;
		process.stdin.isTTY = false;

		await app._executeSearchAction({
			query: "monitor",
			sort: SortOrder.PRICE_ASC,
			skipDetails: true,
		});

		expect(app._runScraperAndExport).toHaveBeenCalledWith(
			expect.objectContaining({
				query: "monitor",
				sort: SortOrder.PRICE_ASC,
				skipDetails: true,
			}),
			expect.any(Object),
			expect.any(Object),
		);

		process.stdin.isTTY = originalIsTTY;
	});

	it("should forward quiet and failOnEmpty CLI flags", async () => {
		app._runScraperAndExport = vi.fn().mockResolvedValue(undefined);

		const originalIsTTY = process.stdin.isTTY;
		process.stdin.isTTY = false;

		await app._executeSearchAction({
			query: "desk",
			quiet: true,
			failOnEmpty: true,
		});

		expect(app._runScraperAndExport).toHaveBeenCalledWith(
			expect.objectContaining({ query: "desk" }),
			expect.any(Object),
			expect.objectContaining({
				quiet: true,
				failOnEmpty: true,
			}),
		);

		process.stdin.isTTY = originalIsTTY;
	});
});
