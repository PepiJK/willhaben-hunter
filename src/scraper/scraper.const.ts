export enum Area {
	WIEN = "wien",
	NIEDEROESTERREICH = "niederösterreich",
	OBEROESTERREICH = "oberösterreich",
	SALZBURG = "salzburg",
	TIROL = "tirol",
	VORARLBERG = "vorarlberg",
	KAERNTEN = "kärnten",
	STEIERMARK = "steiermark",
	BURGENLAND = "burgenland",
}

/**
 * Enum representing Vienna districts.
 */
export enum ViennaDistrict {
	INNERE_STADT = "1. Bezirk (Innere Stadt)",
	LEOPOLDSTADT = "2. Bezirk (Leopoldstadt)",
	LANDSTRASSE = "3. Bezirk (Landstraße)",
	WIEDEN = "4. Bezirk (Wieden)",
	MARGARETEN = "5. Bezirk (Margareten)",
	MARIAHILF = "6. Bezirk (Mariahilf)",
	NEUBAU = "7. Bezirk (Neubau)",
	JOSEFSTADT = "8. Bezirk (Josefstadt)",
	ALSERGRUND = "9. Bezirk (Alsergrund)",
	FAVORITEN = "10. Bezirk (Favoriten)",
	SIMMERING = "11. Bezirk (Simmering)",
	MEIDLING = "12. Bezirk (Meidling)",
	HIETZING = "13. Bezirk (Hietzing)",
	PENZING = "14. Bezirk (Penzing)",
	RUDOLFSHEIM_FUNFHAUS = "15. Bezirk (Rudolfsheim-Fünfhaus)",
	OTTAKRING = "16. Bezirk (Ottakring)",
	HERNALS = "17. Bezirk (Hernals)",
	WAHRING = "18. Bezirk (Währing)",
	DOBLING = "19. Bezirk (Döbling)",
	BRIGITTENAU = "20. Bezirk (Brigittenau)",
	FLORIDSDORF = "21. Bezirk (Floridsdorf)",
	DONAUSTADT = "22. Bezirk (Donaustadt)",
	LIESING = "23. Bezirk (Liesing)",
}

export const areaIdMap: Record<Area, number> = {
	[Area.BURGENLAND]: 1,
	[Area.KAERNTEN]: 2,
	[Area.NIEDEROESTERREICH]: 3,
	[Area.OBEROESTERREICH]: 4,
	[Area.SALZBURG]: 5,
	[Area.STEIERMARK]: 6,
	[Area.TIROL]: 7,
	[Area.VORARLBERG]: 8,
	[Area.WIEN]: 900,
};

/**
 * Supported sort orders for search results.
 */
export enum SortOrder {
	RELEVANCE = "relevance",
	NEWEST = "newest",
	PRICE_ASC = "price-asc",
	PRICE_DESC = "price-desc",
}

/** Maps SortOrder values to willhaben URL sort parameter values. */
export const sortParamMap: Record<SortOrder, string | undefined> = {
	[SortOrder.RELEVANCE]: undefined,
	[SortOrder.NEWEST]: "1",
	[SortOrder.PRICE_ASC]: "2",
	[SortOrder.PRICE_DESC]: "3",
};

/** Maps district numbers (1–23) to ViennaDistrict enum values. */
export const districtNumberMap: Record<number, ViennaDistrict> = {
	1: ViennaDistrict.INNERE_STADT,
	2: ViennaDistrict.LEOPOLDSTADT,
	3: ViennaDistrict.LANDSTRASSE,
	4: ViennaDistrict.WIEDEN,
	5: ViennaDistrict.MARGARETEN,
	6: ViennaDistrict.MARIAHILF,
	7: ViennaDistrict.NEUBAU,
	8: ViennaDistrict.JOSEFSTADT,
	9: ViennaDistrict.ALSERGRUND,
	10: ViennaDistrict.FAVORITEN,
	11: ViennaDistrict.SIMMERING,
	12: ViennaDistrict.MEIDLING,
	13: ViennaDistrict.HIETZING,
	14: ViennaDistrict.PENZING,
	15: ViennaDistrict.RUDOLFSHEIM_FUNFHAUS,
	16: ViennaDistrict.OTTAKRING,
	17: ViennaDistrict.HERNALS,
	18: ViennaDistrict.WAHRING,
	19: ViennaDistrict.DOBLING,
	20: ViennaDistrict.BRIGITTENAU,
	21: ViennaDistrict.FLORIDSDORF,
	22: ViennaDistrict.DONAUSTADT,
	23: ViennaDistrict.LIESING,
};
