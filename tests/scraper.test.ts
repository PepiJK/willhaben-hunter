/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable sonarjs/no-clear-text-protocols */
// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { WillhabenHunterImmoScraper } from "../src/scraper/immo-scraper";
import { WillhabenHunterMarketplaceScraper } from "../src/scraper/marketplace-scraper";

describe("Scraper Evaluate Callbacks Coverage", () => {
	// Polyfill innerText for JSDOM
	if (typeof window !== "undefined") {
		Object.defineProperty(window.HTMLElement.prototype, "innerText", {
			get() {
				return this.textContent;
			},
		});
	}

	it("should cover immo evaluate callback", async () => {
		const scraper = new WillhabenHunterImmoScraper();
		const mockPage = {
			goto: vi.fn(),
			evaluate: vi.fn().mockImplementation(async (cb) => {
				// Setup mock document
				document.body.innerHTML = `
					<div data-testid="ad-description-">Test description</div>
					<div data-testid="attribute-item">
						<span data-testid="attribute-title">Zimmer</span>
						<span data-testid="attribute-value">3</span>
					</div>
					<div data-testid="attribute-item">
						<span data-testid="attribute-title">Wohnfläche</span>
						<span data-testid="attribute-value">75 m²</span>
					</div>
					<div data-testid="attribute-item">
						<span data-testid="attribute-title">Objekttyp</span>
						<span data-testid="attribute-value">Wohnung</span>
					</div>
					<div>
						<h2>Preisinformation</h2>
						<div class="Box-123">
							Miete (exkl. MWSt)
							€ 500
						</div>
					</div>
					<div>
						<h2>Objektstandort</h2>
						<div class="Box-123">
							Test Location 1
						</div>
					</div>
					<div>
						<h2>Lage</h2>
						<div class="Box-123">
							Test Area Description | Mehr anzeigen +
						</div>
					</div>
					<div>
						<h2>Preis und Detail</h2>
						<div class="Box-123">
							Gesamtbelastung | 1000 €
						</div>
					</div>
				`;
				return cb();
			}),
			close: vi.fn(),
		};

		const mockBrowser = {
			newPage: vi.fn().mockResolvedValue(mockPage),
		} as any;

		const result = await scraper["_scrapeItemDetails"](mockBrowser, "http://test");

		expect(result.description).toBe("Test description");
		expect(result.rooms).toBe("3");
		expect(result.livingArea).toBe("75 m²");
		expect(result.propertyType).toBe("Wohnung");
		expect(result.priceInformation).toContain("Miete");
		expect(result.location).toContain("Test Location 1");
		expect(result.areaDescription).toContain("Test Area Description");
		expect(result.priceAndDetailInformation).toContain("Gesamtbelastung");
	});

	it("should cover marketplace evaluate callback", async () => {
		const scraper = new WillhabenHunterMarketplaceScraper();
		const mockPage = {
			goto: vi.fn(),
			evaluate: vi.fn().mockImplementation(async (cb) => {
				document.body.innerHTML = `
					<div data-testid="ad-description-">Marketplace description</div>
					<div data-testid="attribute-item">
						<span data-testid="attribute-title">Zustand</span>
						<span data-testid="attribute-value">Gebraucht</span>
					</div>
				`;
				return cb();
			}),
			close: vi.fn(),
		};

		const mockBrowser = {
			newPage: vi.fn().mockResolvedValue(mockPage),
		} as any;

		const result = await scraper["_scrapeItemDetails"](mockBrowser, "http://test");

		expect(result.description).toBe("Marketplace description");
		expect(result.attributes).toContain("Zustand: Gebraucht");
	});

	it("should cover immo evaluate callback fallback", async () => {
		const scraper = new WillhabenHunterImmoScraper();
		const mockPage = {
			goto: vi.fn(),
			evaluate: vi.fn().mockImplementation(async (cb) => {
				document.body.innerHTML = `
					<p class="description">Fallback desc</p>
					<section>
						<h2>Objektinformationen</h2>
						<ul>
							<li>Zimmer</li>
							<li>4</li>
							<li>Wohnfläche</li>
							<li>120 m²</li>
						</ul>
					</section>
					<div data-testid="ad-detail-teaser-location">
						Fallback Location Teaser
					</div>
					<div>
						<h2>Zusatzinformation</h2>
						<div>Fallback Additional Info</div>
					</div>
				`;
				return cb();
			}),
			close: vi.fn(),
		};

		const mockBrowser = {
			newPage: vi.fn().mockResolvedValue(mockPage),
		} as any;

		const result = await scraper["_scrapeItemDetails"](mockBrowser, "http://test");

		expect(result.description).toBe("Fallback desc");
		expect(result.rooms).toBe("4");
		expect(result.livingArea).toBe("120 m²");
		expect(result.location).toContain("Fallback Location Teaser");
		expect(result.additionalInformation).toContain("Fallback Additional Info");
	});

	it("should cover marketplace evaluate callback fallback", async () => {
		const scraper = new WillhabenHunterMarketplaceScraper();
		const mockPage = {
			goto: vi.fn(),
			evaluate: vi.fn().mockImplementation(async (cb) => {
				document.body.innerHTML = `
					<div class="description">Fallback desc</div>
					<div data-testid="ad-attributes">
						Zustand
						Gebraucht
					</div>
				`;
				return cb();
			}),
			close: vi.fn(),
		};

		const mockBrowser = {
			newPage: vi.fn().mockResolvedValue(mockPage),
		} as any;

		const result = await scraper["_scrapeItemDetails"](mockBrowser, "http://test");

		expect(result.description).toBe("Fallback desc");
		expect(result.attributes).toContain("Zustand");
		expect(result.attributes).toContain("Gebraucht");
	});
});
