import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { CliApp } from "../src/cli/cli";
import * as enquirer from "enquirer";
import { Area, ViennaDistrict } from "../src/scraper/scraper.const";

vi.mock("enquirer", () => ({
	prompt: vi.fn(),
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
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const promptMock = enquirer.prompt as any;

		promptMock
			.mockResolvedValueOnce({ q: "iphone" }) // query
			.mockResolvedValueOnce({ pMin: "100" }) // priceMin
			.mockResolvedValueOnce({ pMax: "500" }) // priceMax
			.mockResolvedValueOnce({ a: [Area.WIEN] }) // area
			.mockResolvedValueOnce({ wd: [ViennaDistrict.INNERE_STADT] }) // wienDistricts
			.mockResolvedValueOnce({ l: "10" }); // limit

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

		expect(enquirer.prompt).not.toHaveBeenCalled();
		expect(result.query).toBe("macbook");
		expect(result.priceMin).toBe(200);
		expect(result.priceMax).toBe(1000);
		expect(result.area).toEqual([Area.KAERNTEN]);
		expect(result.limit).toBe(5);
		expect(result.wienDistricts).toBeUndefined();
	});

	it("should handle empty/skipped inputs gracefully", async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const promptMock = enquirer.prompt as any;

		promptMock
			.mockResolvedValueOnce({ q: "laufband" }) // query
			.mockResolvedValueOnce({ pMin: "" }) // empty priceMin
			.mockResolvedValueOnce({ pMax: "   " }) // empty priceMax
			.mockResolvedValueOnce({ a: [] }) // empty area
			.mockResolvedValueOnce({ l: "" }); // empty limit

		const result = await app._handleInteractivePrompts({});

		expect(result.query).toBe("laufband");
		expect(result.priceMin).toBeUndefined();
		expect(result.priceMax).toBeUndefined();
		expect(result.area).toBeUndefined();
		expect(result.wienDistricts).toBeUndefined();
		expect(result.limit).toBeUndefined();
	});

	it("should prompt for Vienna districts only if Wien is selected as area", async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const promptMock = enquirer.prompt as any;

		promptMock
			.mockResolvedValueOnce({ q: "fahrrad" }) // query
			.mockResolvedValueOnce({ pMin: "" })
			.mockResolvedValueOnce({ pMax: "" })
			.mockResolvedValueOnce({ a: [Area.WIEN] }) // area is Wien
			.mockResolvedValueOnce({ wd: [] }) // User skipped specific districts
			.mockResolvedValueOnce({ l: "" });

		const result = await app._handleInteractivePrompts({});

		expect(result.area).toEqual([Area.WIEN]);
		expect(result.wienDistricts).toBeUndefined(); // empty selection converts to undefined
		expect(promptMock).toHaveBeenCalledTimes(6); // including the wien district prompt
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
