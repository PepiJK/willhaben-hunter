/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { chromium } from "playwright-extra";
import { WillhabenHunterMarketplaceScraper } from "../src/scraper/marketplace-scraper";
import { WillhabenHunterImmoScraper } from "../src/scraper/immo-scraper";
import { WillhabenHunterImmoType } from "../src/scraper/scraper.const";

vi.mock("playwright-extra", () => ({
	chromium: {
		use: vi.fn(),
		launch: vi.fn(),
	},
}));

vi.mock("puppeteer-extra-plugin-stealth", () => ({
	default: vi.fn(() => ({})),
}));

describe("Scraper Core Logic Coverage", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// jsdom doesn't support innerText or scrollBy
		if (
			typeof HTMLElement !== "undefined" &&
			!Object.getOwnPropertyDescriptor(HTMLElement.prototype, "innerText")
		) {
			Object.defineProperty(HTMLElement.prototype, "innerText", {
				get() {
					return this.textContent || "";
				},
			});
		}
		if (typeof window !== "undefined") {
			window.scrollBy = vi.fn();
		}
	});

	it("should scrape marketplace items and handle pagination correctly", async () => {
		const mockPage = {
			goto: vi.fn().mockResolvedValue(true),
			click: vi.fn().mockResolvedValue(true),
			waitForSelector: vi.fn().mockResolvedValue(true),
			evaluate: vi.fn().mockImplementation((cbOrString) => {
				if (typeof cbOrString === "function") {
					document.body.innerHTML = `
						<div data-testid="result-list-title">5 Ergebnisse</div>
						<div data-testid="ad-description">Desc</div>
						<div data-testid="ad-attributes">Attr</div>
					`;
					return cbOrString();
				}
				return null;
			}),
			$$eval: vi.fn().mockImplementation((sel, cb) => {
				if (typeof cb === "function") {
					const el = document.createElement("a");
					el.id = "search-result-entry-header-1";
					el.setAttribute("href", "/url1");
					el.innerHTML =
						"<h3>Item 1</h3><div data-testid='search-result-entry-price-1'>10</div>";
					return cb([el]);
				}
				return [];
			}),
			waitForTimeout: vi.fn().mockResolvedValue(true),
			close: vi.fn().mockResolvedValue(true),
		};

		const mockBrowser = {
			newPage: vi.fn().mockResolvedValue(mockPage),
			close: vi.fn().mockResolvedValue(true),
		};

		(chromium.launch as any).mockResolvedValue(mockBrowser);

		const scraper = new WillhabenHunterMarketplaceScraper();
		const results = await scraper.scrape({
			query: "test",
			limit: 40,
			onProgress: vi.fn(),
		});

		expect(results).toHaveLength(5);
		expect(chromium.launch).toHaveBeenCalled();
	});

	it("should scrape immo items and handle pagination correctly", async () => {
		const mockPage = {
			goto: vi.fn().mockResolvedValue(true),
			click: vi.fn().mockResolvedValue(true),
			waitForSelector: vi.fn().mockResolvedValue(true),
			evaluate: vi.fn().mockImplementation((cbOrString) => {
				if (typeof cbOrString === "function") {
					document.body.innerHTML = `
						<div data-testid="result-list-title">5 Ergebnisse</div>
						<div data-testid="ad-description">Desc</div>
						<div data-testid="ad-attributes">Attr</div>
						<div data-testid="attribute-item">
							<span data-testid="attribute-title">Zimmer</span>
							<span data-testid="attribute-value">3</span>
						</div>
					`;
					return cbOrString();
				}
				return null;
			}),
			$$eval: vi.fn().mockImplementation((sel, cb) => {
				if (typeof cb === "function") {
					const el = document.createElement("a");
					el.id = "search-result-entry-header-1";
					el.setAttribute("href", "/url1");
					el.innerHTML =
						"<h3>Item 1</h3><div data-testid='search-result-entry-price-1'>10</div>";
					return cb([el]);
				}
				return [];
			}),
			waitForTimeout: vi.fn().mockResolvedValue(true),
			close: vi.fn().mockResolvedValue(true),
		};

		const mockBrowser = {
			newPage: vi.fn().mockResolvedValue(mockPage),
			close: vi.fn().mockResolvedValue(true),
		};

		(chromium.launch as any).mockResolvedValue(mockBrowser);

		const scraper = new WillhabenHunterImmoScraper();
		const results = await scraper.scrape({
			type: WillhabenHunterImmoType.WOHNUNG_MIETEN,
			limit: 40,
			onProgress: vi.fn(),
		});

		expect(results).toHaveLength(5);
		expect(chromium.launch).toHaveBeenCalled();
	});

	it("should throw error if totalResultsText is not a number in marketplace", async () => {
		const mockPage = {
			goto: vi.fn().mockResolvedValue(true),
			click: vi.fn().mockResolvedValue(true),
			waitForSelector: vi.fn().mockResolvedValue(true),
			evaluate: vi.fn().mockReturnValue("invalid"),
			$$eval: vi.fn().mockResolvedValue([]),
			waitForTimeout: vi.fn().mockResolvedValue(true),
			close: vi.fn().mockResolvedValue(true),
		};
		const mockBrowser = {
			newPage: vi.fn().mockResolvedValue(mockPage),
			close: vi.fn().mockResolvedValue(true),
		};
		(chromium.launch as any).mockResolvedValue(mockBrowser);

		const scraper = new WillhabenHunterMarketplaceScraper();
		await expect(scraper.scrape({ query: "test" })).rejects.toThrow(
			/Could not determine total number/,
		);
	});

	it("should throw error if totalResultsText is not a number in immo", async () => {
		const mockPage = {
			goto: vi.fn().mockResolvedValue(true),
			click: vi.fn().mockResolvedValue(true),
			waitForSelector: vi.fn().mockResolvedValue(true),
			evaluate: vi.fn().mockReturnValue("invalid"),
			$$eval: vi.fn().mockResolvedValue([]),
			waitForTimeout: vi.fn().mockResolvedValue(true),
			close: vi.fn().mockResolvedValue(true),
		};
		const mockBrowser = {
			newPage: vi.fn().mockResolvedValue(mockPage),
			close: vi.fn().mockResolvedValue(true),
		};
		(chromium.launch as any).mockResolvedValue(mockBrowser);

		const scraper = new WillhabenHunterImmoScraper();
		await expect(
			scraper.scrape({ type: WillhabenHunterImmoType.WOHNUNG_MIETEN }),
		).rejects.toThrow(/Could not determine total number/);
	});

	it("should throw error if totalResultsText > 0 but items array is empty", async () => {
		const mockPage = {
			goto: vi.fn().mockResolvedValue(true),
			click: vi.fn().mockResolvedValue(true),
			waitForSelector: vi.fn().mockResolvedValue(true),
			evaluate: vi.fn().mockReturnValue("5"),
			$$eval: vi.fn().mockResolvedValue([]),
			waitForTimeout: vi.fn().mockResolvedValue(true),
			close: vi.fn().mockResolvedValue(true),
		};
		const mockBrowser = {
			newPage: vi.fn().mockResolvedValue(mockPage),
			close: vi.fn().mockResolvedValue(true),
		};
		(chromium.launch as any).mockResolvedValue(mockBrowser);

		const scraper = new WillhabenHunterMarketplaceScraper();
		await expect(scraper.scrape({ query: "test" })).rejects.toThrow(
			/No items extracted from the DOM despite search results/,
		);
	});

	it("should handle error during details fetch without throwing", async () => {
		const mockPageList = {
			goto: vi.fn().mockResolvedValue(true),
			click: vi.fn().mockResolvedValue(true),
			waitForSelector: vi.fn().mockResolvedValue(true),
			evaluate: vi.fn().mockReturnValue("1"),
			$$eval: vi.fn().mockResolvedValue([{ id: "1", title: "Item 1", url: "https://url1" }]),
			waitForTimeout: vi.fn().mockResolvedValue(true),
			close: vi.fn().mockResolvedValue(true),
		};

		const mockPageDetails = {
			goto: vi.fn().mockRejectedValue(new Error("Timeout")),
			close: vi.fn().mockResolvedValue(true),
		};

		const mockBrowser = {
			newPage: vi
				.fn()
				.mockResolvedValueOnce(mockPageList) // For list page
				.mockResolvedValueOnce(mockPageDetails), // For detail page
			close: vi.fn().mockResolvedValue(true),
		};

		(chromium.launch as any).mockResolvedValue(mockBrowser);

		const scraper = new WillhabenHunterMarketplaceScraper();
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const results = await scraper.scrape({ query: "test" });
		expect(results).toHaveLength(1); // Should still return the item despite detail fetch error
		warnSpy.mockRestore();
	});

	it("should handle error during details fetch without throwing for immo", async () => {
		const mockPageList = {
			goto: vi.fn().mockResolvedValue(true),
			click: vi.fn().mockResolvedValue(true),
			waitForSelector: vi.fn().mockResolvedValue(true),
			evaluate: vi.fn().mockReturnValue("1"),
			$$eval: vi.fn().mockResolvedValue([{ id: "1", title: "Item 1", url: "https://url1" }]),
			waitForTimeout: vi.fn().mockResolvedValue(true),
			close: vi.fn().mockResolvedValue(true),
		};

		const mockPageDetails = {
			goto: vi.fn().mockRejectedValue(new Error("Timeout")),
			close: vi.fn().mockResolvedValue(true),
		};

		const mockBrowser = {
			newPage: vi
				.fn()
				.mockResolvedValueOnce(mockPageList) // For list page
				.mockResolvedValueOnce(mockPageDetails), // For detail page
			close: vi.fn().mockResolvedValue(true),
		};

		(chromium.launch as any).mockResolvedValue(mockBrowser);

		const scraper = new WillhabenHunterImmoScraper();
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const results = await scraper.scrape({
			type: WillhabenHunterImmoType.HAUS_MIETEN,
			onProgress: vi.fn(),
		});
		expect(results).toHaveLength(1); // Should still return the item despite detail fetch error
		warnSpy.mockRestore();
	});
});
