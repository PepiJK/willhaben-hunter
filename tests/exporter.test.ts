import { afterEach, describe, expect, it, vi } from "vitest";
import { WillhabenHunterCsvExporter } from "../src/exporter/csv-exporter";
import { WillhabenHunterExporter } from "../src/exporter/exporter";
import { WillhabenHunterJsonExporter } from "../src/exporter/json-exporter";
import { WillhabenHunterItem } from "../src/scraper/scraper.interface";

vi.mock("fs", async () => {
	const actual = await vi.importActual("fs");
	return {
		...actual,
		existsSync: vi.fn().mockReturnValue(false),
		mkdirSync: vi.fn(),
		writeFileSync: vi.fn(),
	};
});

vi.mock("csv-writer", () => {
	return {
		createObjectCsvWriter: vi.fn().mockReturnValue({
			writeRecords: vi.fn().mockResolvedValue(true),
		}),
		createObjectCsvStringifier: vi
			.fn()
			.mockImplementation((opts: { header: { id: string; title: string }[] }) => {
				const headerLine = opts.header.map((h) => h.title).join(",") + "\n";
				return {
					getHeaderString: vi.fn().mockReturnValue(headerLine),
					stringifyRecords: vi
						.fn()
						.mockReturnValue('123,"Test Item","100","https://example.com/1",,\n'),
				};
			}),
	};
});

const sampleItems: WillhabenHunterItem[] = [
	{ id: "123", title: "Test Item", price: "100", url: "https://example.com/1" },
	{ id: "456", title: "Test Item 2", price: "200", url: "https://example.com/2" },
];

describe("WillhabenHunterCsvExporter", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should export items to a csv file without throwing errors", async () => {
		await expect(
			WillhabenHunterCsvExporter.exportToFile(sampleItems, "test.csv"),
		).resolves.toBeUndefined();
	});

	it("should return a CSV string for console output", () => {
		const result = WillhabenHunterCsvExporter.toConsoleString(sampleItems);
		expect(result).toContain("ID,TITLE,PRICE,URL,DESCRIPTION,ATTRIBUTES");
		expect(result).toContain("123");
	});

	it("should export immo items to a csv file without throwing errors", async () => {
		await expect(
			WillhabenHunterCsvExporter.exportImmoToFile(
				[
					{
						id: "1001",
						title: "Test Immo Item",
						price: "200",
						url: "https://example.com/3",
						rooms: "3",
					},
				],
				"test-immo.csv",
			),
		).resolves.toBeUndefined();
	});

	it("should not create dir if it already exists (marketplace)", async () => {
		const fs = await import("fs");
		vi.mocked(fs.existsSync).mockReturnValueOnce(true);
		const mkdirSpy = vi.spyOn(fs, "mkdirSync");
		await WillhabenHunterCsvExporter.exportToFile(sampleItems, "test.csv");
		expect(mkdirSpy).not.toHaveBeenCalled();
	});

	it("should not create dir if it already exists (immo)", async () => {
		const fs = await import("fs");
		vi.mocked(fs.existsSync).mockReturnValueOnce(true);
		const mkdirSpy = vi.spyOn(fs, "mkdirSync");
		await WillhabenHunterCsvExporter.exportImmoToFile([], "test-immo.csv");
		expect(mkdirSpy).not.toHaveBeenCalled();
	});
});

describe("WillhabenHunterJsonExporter", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should export items to a JSON file without throwing errors", async () => {
		await expect(
			WillhabenHunterJsonExporter.exportToFile(sampleItems, "output/test.json"),
		).resolves.toBeUndefined();
	});

	it("should return a formatted JSON string for console output", () => {
		const result = WillhabenHunterJsonExporter.toConsoleString(sampleItems);
		const parsed = JSON.parse(result);
		expect(parsed).toHaveLength(2);
		expect(parsed[0].id).toBe("123");
		expect(parsed[1].title).toBe("Test Item 2");
	});

	it("should not create dir if it already exists", async () => {
		const fs = await import("fs");
		vi.mocked(fs.existsSync).mockReturnValueOnce(true);
		const mkdirSpy = vi.spyOn(fs, "mkdirSync");
		await WillhabenHunterJsonExporter.exportToFile(sampleItems, "output/test.json");
		expect(mkdirSpy).not.toHaveBeenCalled();
	});
});

describe("WillhabenHunterExporter facade", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should route to JSON file export when format is json and outputPath given", async () => {
		const spy = vi
			.spyOn(WillhabenHunterJsonExporter, "exportToFile")
			.mockResolvedValue(undefined);
		const result = await WillhabenHunterExporter.export(sampleItems, {
			format: "json",
			outputPath: "output/test.json",
		});
		expect(spy).toHaveBeenCalledWith(sampleItems, "output/test.json");
		expect(result).toBe("output/test.json");
	});

	it("should route to CSV file export when format is csv and outputPath given", async () => {
		const spy = vi
			.spyOn(WillhabenHunterCsvExporter, "exportToFile")
			.mockResolvedValue(undefined);
		const result = await WillhabenHunterExporter.export(sampleItems, {
			format: "csv",
			outputPath: "output/test.csv",
		});
		expect(spy).toHaveBeenCalledWith(sampleItems, "output/test.csv");
		expect(result).toBe("output/test.csv");
	});

	it("should print JSON to stdout when no outputPath and format is json", async () => {
		const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation((chunk, cb) => {
			if (typeof cb === "function") cb();
			return true;
		});
		const result = await WillhabenHunterExporter.export(sampleItems, { format: "json" });
		expect(writeSpy).toHaveBeenCalled();
		const output = writeSpy.mock.calls[0]![0] as string;
		expect(JSON.parse(output)).toHaveLength(2);
		expect(result).toBeUndefined();
		writeSpy.mockRestore();
	});

	it("should print CSV to stdout when no outputPath and format is csv", async () => {
		const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation((chunk, cb) => {
			if (typeof cb === "function") cb();
			return true;
		});
		const result = await WillhabenHunterExporter.export(sampleItems, { format: "csv" });
		expect(writeSpy).toHaveBeenCalled();
		expect(result).toBeUndefined();
		writeSpy.mockRestore();
	});
});

describe("WillhabenHunterExporter immo facade", () => {
	const sampleImmoItems = [
		{
			id: "1001",
			title: "Schöne Altbauwohnung",
			price: "€ 800",
			url: "https://www.willhaben.at/iad/immobilien/d/mietwohnungen/wien/1",
			rooms: "3",
			livingArea: "75 m²",
			propertyType: "Mietwohnung",
			description: "Ruhige Lage...",
			attributes: "Zimmer: 3 | Fläche: 75 m²",
		},
	];

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should route to immo CSV file export when format is csv and outputPath given", async () => {
		const spy = vi
			.spyOn(WillhabenHunterCsvExporter, "exportImmoToFile")
			.mockResolvedValue(undefined);
		const result = await WillhabenHunterExporter.exportImmo(sampleImmoItems, {
			format: "csv",
			outputPath: "output/immo.csv",
		});
		expect(spy).toHaveBeenCalledWith(sampleImmoItems, "output/immo.csv");
		expect(result).toBe("output/immo.csv");
	});

	it("should route to JSON file export for immo when format is json", async () => {
		const spy = vi
			.spyOn(WillhabenHunterJsonExporter, "exportToFile")
			.mockResolvedValue(undefined);
		const result = await WillhabenHunterExporter.exportImmo(sampleImmoItems, {
			format: "json",
			outputPath: "output/immo.json",
		});
		expect(spy).toHaveBeenCalledWith(sampleImmoItems, "output/immo.json");
		expect(result).toBe("output/immo.json");
	});

	it("should print immo CSV to stdout when no outputPath", async () => {
		const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation((chunk, cb) => {
			if (typeof cb === "function") cb();
			return true;
		});
		const result = await WillhabenHunterExporter.exportImmo(sampleImmoItems, {
			format: "csv",
		});
		expect(writeSpy).toHaveBeenCalled();
		const output = writeSpy.mock.calls[0]![0] as string;
		expect(output).toContain("ROOMS");
		expect(output).toContain("LIVING_AREA");
		expect(output).toContain("PROPERTY_TYPE");
		expect(result).toBeUndefined();
		writeSpy.mockRestore();
	});

	it("should print immo JSON to stdout when no outputPath", async () => {
		const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation((chunk, cb) => {
			if (typeof cb === "function") cb();
			return true;
		});
		const result = await WillhabenHunterExporter.exportImmo(sampleImmoItems, {
			format: "json",
		});
		expect(writeSpy).toHaveBeenCalled();
		const output = writeSpy.mock.calls[0]![0] as string;
		expect(JSON.parse(output)).toHaveLength(1);
		expect(result).toBeUndefined();
		writeSpy.mockRestore();
	});
});
