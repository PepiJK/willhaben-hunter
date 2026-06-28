import { afterEach, describe, expect, it, vi } from "vitest";
import { CsvExporter } from "../src/exporter/csv-exporter";

vi.mock("fs", async () => {
	const actual = await vi.importActual("fs");
	return {
		...actual,
		existsSync: vi.fn().mockReturnValue(false),
		mkdirSync: vi.fn(),
		writeFileSync: vi.fn(),
	};
});

// Since csv-writer uses fs internally, we mock its createObjectCsvWriter directly or just check if it doesn't throw.
vi.mock("csv-writer", () => {
	return {
		createObjectCsvWriter: vi.fn().mockReturnValue({
			writeRecords: vi.fn().mockResolvedValue(true),
		}),
	};
});

describe("Exporter Suite", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should export items to a csv file without throwing errors", async () => {
		const items = [
			{ id: "123", title: "Test Item", price: "100", url: "https://example.com/1" },
			{ id: "456", title: "Test Item 2", price: "200", url: "https://example.com/2" },
		];

		// We just ensure calling it doesn't throw and resolves successfully
		await expect(CsvExporter.export(items, "test.csv")).resolves.toBeUndefined();
	});
});
