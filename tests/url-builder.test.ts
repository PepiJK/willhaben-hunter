import { describe, expect, it } from "vitest";
import { WillhabenHunterImmoScraper } from "../src/scraper/immo-scraper";
import { WillhabenHunterMarketplaceScraper } from "../src/scraper/marketplace-scraper";
import {
	WillhabenHunterArea,
	WillhabenHunterImmoType,
	WillhabenHunterSortOrder,
	WillhabenHunterViennaDistrict,
} from "../src/scraper/scraper.const";

describe("Marketplace URL Builder Suite", () => {
	it("should build a basic url with only a keyword", () => {
		const scraper = new WillhabenHunterMarketplaceScraper();
		const url = scraper.buildUrl({ query: "iphone" });
		expect(url).toBe(
			"https://www.willhaben.at/iad/kaufen-und-verkaufen/marktplatz?keyword=iphone&isNavigation=true",
		);
	});

	it("should include min and max prices", () => {
		const scraper = new WillhabenHunterMarketplaceScraper();
		const url = scraper.buildUrl({ query: "macbook", priceMin: 500, priceMax: 1500 });
		expect(url).toContain("PRICE_FROM=500");
		expect(url).toContain("PRICE_TO=1500");
	});

	it("should include standard area IDs", () => {
		const scraper = new WillhabenHunterMarketplaceScraper();
		const url = scraper.buildUrl({
			query: "bike",
			area: [WillhabenHunterArea.TIROL, WillhabenHunterArea.SALZBURG],
		});
		// Tirol is 7, Salzburg is 5
		expect(url).toContain("areaId=7");
		expect(url).toContain("areaId=5");
	});

	it("should include generic Wien area ID if no districts are specified", () => {
		const scraper = new WillhabenHunterMarketplaceScraper();
		const url = scraper.buildUrl({ query: "desk", area: [WillhabenHunterArea.WIEN] });
		expect(url).toContain("areaId=900");
	});

	it("should include specific Vienna district IDs and exclude generic Wien ID", () => {
		const scraper = new WillhabenHunterMarketplaceScraper();
		const url = scraper.buildUrl({
			query: "chair",
			area: [WillhabenHunterArea.WIEN],
			wienDistricts: [
				WillhabenHunterViennaDistrict.INNERE_STADT,
				WillhabenHunterViennaDistrict.LIESING,
			],
		});

		// Innere Stadt (1st) = 117223
		// Liesing (23rd) = 117245
		expect(url).toContain("areaId=117223");
		expect(url).toContain("areaId=117245");
		expect(url).not.toContain("areaId=900");
	});

	it("should include sort parameter when specified", () => {
		const scraper = new WillhabenHunterMarketplaceScraper();
		const url = scraper.buildUrl({ query: "sofa", sort: WillhabenHunterSortOrder.PRICE_ASC });
		expect(url).toContain("sort=2");
	});

	it("should not include sort parameter for relevance (default)", () => {
		const scraper = new WillhabenHunterMarketplaceScraper();
		const url = scraper.buildUrl({ query: "sofa", sort: WillhabenHunterSortOrder.RELEVANCE });
		expect(url).not.toContain("sort=");
	});

	it("should not include sort parameter when sort is undefined", () => {
		const scraper = new WillhabenHunterMarketplaceScraper();
		const url = scraper.buildUrl({ query: "sofa" });
		expect(url).not.toContain("sort=");
	});

	it("should fallback to generic Wien area ID if district has no number prefix", () => {
		const scraper = new WillhabenHunterMarketplaceScraper();
		const url = scraper.buildUrl({
			query: "chair",
			area: [WillhabenHunterArea.WIEN],
			wienDistricts: ["invalid_district" as WillhabenHunterViennaDistrict],
		});
		expect(url).toContain("areaId=900");
	});
});

describe("Immo URL Builder Suite", () => {
	it("should build a basic URL for Wohnung mieten", () => {
		const scraper = new WillhabenHunterImmoScraper();
		const url = scraper.buildUrl({ type: WillhabenHunterImmoType.WOHNUNG_MIETEN });
		expect(url).toContain("/iad/immobilien/mietwohnungen/mietwohnung-angebote");
		expect(url).toContain("isNavigation=true");
	});

	it("should build correct URL paths for all immo types", () => {
		const scraper = new WillhabenHunterImmoScraper();

		expect(scraper.buildUrl({ type: WillhabenHunterImmoType.WOHNUNG_MIETEN })).toContain(
			"mietwohnungen/mietwohnung-angebote",
		);
		expect(scraper.buildUrl({ type: WillhabenHunterImmoType.WOHNUNG_KAUFEN })).toContain(
			"eigentumswohnung/eigentumswohnung-angebote",
		);
		expect(scraper.buildUrl({ type: WillhabenHunterImmoType.HAUS_MIETEN })).toContain(
			"haus-mieten/haus-angebote",
		);
		expect(scraper.buildUrl({ type: WillhabenHunterImmoType.HAUS_KAUFEN })).toContain(
			"haus-kaufen/haus-angebote",
		);
		expect(scraper.buildUrl({ type: WillhabenHunterImmoType.GRUNDSTUECK_KAUFEN })).toContain(
			"grundstuecke/grundstueck-angebote",
		);
	});

	it("should include keyword when query is provided", () => {
		const scraper = new WillhabenHunterImmoScraper();
		const url = scraper.buildUrl({
			type: WillhabenHunterImmoType.WOHNUNG_MIETEN,
			query: "altbau",
		});
		expect(url).toContain("keyword=altbau");
	});

	it("should not include keyword param when query is omitted", () => {
		const scraper = new WillhabenHunterImmoScraper();
		const url = scraper.buildUrl({ type: WillhabenHunterImmoType.WOHNUNG_MIETEN });
		expect(url).not.toContain("keyword=");
	});

	it("should include price range params", () => {
		const scraper = new WillhabenHunterImmoScraper();
		const url = scraper.buildUrl({
			type: WillhabenHunterImmoType.WOHNUNG_MIETEN,
			priceMin: 100,
			priceMax: 1000,
		});
		expect(url).toContain("PRICE_FROM=100");
		expect(url).toContain("PRICE_TO=1000");
	});

	it("should map rooms to correct NO_OF_ROOMS_BUCKET value", () => {
		const scraper = new WillhabenHunterImmoScraper();

		expect(
			scraper.buildUrl({ type: WillhabenHunterImmoType.WOHNUNG_MIETEN, rooms: 1 }),
		).toContain("NO_OF_ROOMS_BUCKET=1X1");

		expect(
			scraper.buildUrl({ type: WillhabenHunterImmoType.WOHNUNG_MIETEN, rooms: 3 }),
		).toContain("NO_OF_ROOMS_BUCKET=3X3");

		expect(
			scraper.buildUrl({ type: WillhabenHunterImmoType.WOHNUNG_MIETEN, rooms: 5 }),
		).toContain("NO_OF_ROOMS_BUCKET=5X5");
	});

	it("should include living area size params", () => {
		const scraper = new WillhabenHunterImmoScraper();
		const url = scraper.buildUrl({
			type: WillhabenHunterImmoType.WOHNUNG_MIETEN,
			sizeMin: 40,
			sizeMax: 100,
		});
		expect(url).toContain("ESTATE_SIZE");
		expect(url).toContain("40");
		expect(url).toContain("100");
	});

	it("should include area IDs for Bundesland", () => {
		const scraper = new WillhabenHunterImmoScraper();
		const url = scraper.buildUrl({
			type: WillhabenHunterImmoType.HAUS_KAUFEN,
			area: [WillhabenHunterArea.TIROL],
		});
		expect(url).toContain("areaId=7");
	});

	it("should use generic Wien ID when no districts are specified", () => {
		const scraper = new WillhabenHunterImmoScraper();
		const url = scraper.buildUrl({
			type: WillhabenHunterImmoType.WOHNUNG_MIETEN,
			area: [WillhabenHunterArea.WIEN],
		});
		expect(url).toContain("areaId=900");
	});

	it("should use specific Vienna district IDs and exclude generic Wien ID", () => {
		const scraper = new WillhabenHunterImmoScraper();
		const url = scraper.buildUrl({
			type: WillhabenHunterImmoType.WOHNUNG_MIETEN,
			area: [WillhabenHunterArea.WIEN],
			wienDistricts: [
				WillhabenHunterViennaDistrict.MARIAHILF,
				WillhabenHunterViennaDistrict.NEUBAU,
			],
		});
		// 6. Bezirk (Mariahilf) = 117228
		// 7. Bezirk (Neubau) = 117229
		expect(url).toContain("areaId=117228");
		expect(url).toContain("areaId=117229");
		expect(url).not.toContain("areaId=900");
	});

	it("should handle a full search like the example URL", () => {
		const scraper = new WillhabenHunterImmoScraper();
		const url = scraper.buildUrl({
			type: WillhabenHunterImmoType.WOHNUNG_MIETEN,
			area: [WillhabenHunterArea.WIEN],
			rooms: 3,
			query: "alt",
			priceMin: 100,
			priceMax: 1000000,
			sizeMin: 1,
			sizeMax: 100,
		});
		expect(url).toContain("mietwohnungen/mietwohnung-angebote");
		expect(url).toContain("areaId=900");
		expect(url).toContain("NO_OF_ROOMS_BUCKET=3X3");
		expect(url).toContain("keyword=alt");
		expect(url).toContain("PRICE_FROM=100");
		expect(url).toContain("PRICE_TO=1000000");
	});
	it("should fallback to generic Wien area ID if district has no number prefix", () => {
		const scraper = new WillhabenHunterImmoScraper();
		const url = scraper.buildUrl({
			type: WillhabenHunterImmoType.WOHNUNG_MIETEN,
			area: [WillhabenHunterArea.WIEN],
			wienDistricts: ["invalid_district" as WillhabenHunterViennaDistrict],
		});
		expect(url).toContain("areaId=900");
	});
});
