import { describe, expect, it, vi, beforeEach, afterEach, Mock } from "vitest";
import { CliApp } from "../src/cli/cli";
import * as inquirerPrompts from "@inquirer/prompts";
import { Area, ViennaDistrict } from "../src/scraper/scraper.const";

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

	it("should bypass prompts and use strict options when not in TTY environment", async () => {
		app._runScraperAndExport = vi.fn().mockResolvedValue(undefined);

		// Simulate non-TTY environment (e.g. CI or piped execution)
		const originalIsTTY = process.stdin.isTTY;
		process.stdin.isTTY = false;

		await app._executeSearchAction({
			query: "test query",
			priceMin: 10,
			limit: 5,
		});

		expect(app._runScraperAndExport).toHaveBeenCalledWith(
			expect.objectContaining({
				query: "test query",
				priceMin: 10,
				limit: 5,
			}),
		);

		process.stdin.isTTY = originalIsTTY;
	});
});
