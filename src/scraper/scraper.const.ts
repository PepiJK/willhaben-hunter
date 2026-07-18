export enum WillhabenHunterArea {
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
export enum WillhabenHunterViennaDistrict {
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

export const WILLHABEN_HUNTER_AREA_ID_MAP: Record<WillhabenHunterArea, number> = {
	[WillhabenHunterArea.BURGENLAND]: 1,
	[WillhabenHunterArea.KAERNTEN]: 2,
	[WillhabenHunterArea.NIEDEROESTERREICH]: 3,
	[WillhabenHunterArea.OBEROESTERREICH]: 4,
	[WillhabenHunterArea.SALZBURG]: 5,
	[WillhabenHunterArea.STEIERMARK]: 6,
	[WillhabenHunterArea.TIROL]: 7,
	[WillhabenHunterArea.VORARLBERG]: 8,
	[WillhabenHunterArea.WIEN]: 900,
};

/**
 * Supported sort orders for search results.
 */
export enum WillhabenHunterSortOrder {
	RELEVANZ = "relevanz",
	NEUESTE = "neueste",
	PREIS_AUFSTEIGEND = "preis-aufsteigend",
	PREIS_ABSTEIGEND = "preis-absteigend",
}

/** Maps SortOrder values to willhaben URL sort parameter values. */
export const WILLHABEN_HUNTER_SORT_PARAM_MAP: Record<WillhabenHunterSortOrder, string | undefined> =
	{
		[WillhabenHunterSortOrder.RELEVANZ]: undefined,
		[WillhabenHunterSortOrder.NEUESTE]: "1",
		[WillhabenHunterSortOrder.PREIS_AUFSTEIGEND]: "2",
		[WillhabenHunterSortOrder.PREIS_ABSTEIGEND]: "3",
	};

/** Maps district numbers (1–23) to WillhabenHunterViennaDistrict enum values. */
export const WILLHABEN_HUNTER_DISTRICT_NUMBER_MAP: Record<number, WillhabenHunterViennaDistrict> = {
	1: WillhabenHunterViennaDistrict.INNERE_STADT,
	2: WillhabenHunterViennaDistrict.LEOPOLDSTADT,
	3: WillhabenHunterViennaDistrict.LANDSTRASSE,
	4: WillhabenHunterViennaDistrict.WIEDEN,
	5: WillhabenHunterViennaDistrict.MARGARETEN,
	6: WillhabenHunterViennaDistrict.MARIAHILF,
	7: WillhabenHunterViennaDistrict.NEUBAU,
	8: WillhabenHunterViennaDistrict.JOSEFSTADT,
	9: WillhabenHunterViennaDistrict.ALSERGRUND,
	10: WillhabenHunterViennaDistrict.FAVORITEN,
	11: WillhabenHunterViennaDistrict.SIMMERING,
	12: WillhabenHunterViennaDistrict.MEIDLING,
	13: WillhabenHunterViennaDistrict.HIETZING,
	14: WillhabenHunterViennaDistrict.PENZING,
	15: WillhabenHunterViennaDistrict.RUDOLFSHEIM_FUNFHAUS,
	16: WillhabenHunterViennaDistrict.OTTAKRING,
	17: WillhabenHunterViennaDistrict.HERNALS,
	18: WillhabenHunterViennaDistrict.WAHRING,
	19: WillhabenHunterViennaDistrict.DOBLING,
	20: WillhabenHunterViennaDistrict.BRIGITTENAU,
	21: WillhabenHunterViennaDistrict.FLORIDSDORF,
	22: WillhabenHunterViennaDistrict.DONAUSTADT,
	23: WillhabenHunterViennaDistrict.LIESING,
};

/**
 * Supported real-estate listing types for the immo scraper.
 */
export enum WillhabenHunterImmoType {
	WOHNUNG_MIETEN = "wohnung-mieten",
	WOHNUNG_KAUFEN = "wohnung-kaufen",
	HAUS_MIETEN = "haus-mieten",
	HAUS_KAUFEN = "haus-kaufen",
	GRUNDSTUECK_KAUFEN = "grundstueck-kaufen",
}

/** Maps WillhabenHunterImmoType to the URL path segment on willhaben.at/iad/immobilien/. */
export const WILLHABEN_HUNTER_IMMO_URL_PATH_MAP: Record<WillhabenHunterImmoType, string> = {
	[WillhabenHunterImmoType.WOHNUNG_MIETEN]: "mietwohnungen/mietwohnung-angebote",
	[WillhabenHunterImmoType.WOHNUNG_KAUFEN]: "eigentumswohnung/eigentumswohnung-angebote",
	[WillhabenHunterImmoType.HAUS_MIETEN]: "haus-mieten/haus-angebote",
	[WillhabenHunterImmoType.HAUS_KAUFEN]: "haus-kaufen/haus-angebote",
	[WillhabenHunterImmoType.GRUNDSTUECK_KAUFEN]: "grundstuecke/grundstueck-angebote",
};

/**
 * Maps a minimum room count (1–5+) to willhaben's NO_OF_ROOMS_BUCKET query value.
 * Semantics: "at least N rooms".
 */
export const WILLHABEN_HUNTER_IMMO_ROOMS_BUCKET_MAP: Record<number, string> = {
	1: "1X1",
	2: "2X2",
	3: "3X3",
	4: "4X4",
	5: "5X5",
};

/**
 * Jobs-specific Enums
 */

export enum WillhabenHunterJobsCompanyType {
	PERSONALBERATUNG = "personalberatung",
	DIREKTER_ARBEITGEBER = "direkter_arbeitgeber",
}

export const WILLHABEN_HUNTER_JOBS_COMPANY_TYPE_MAP: Record<
	WillhabenHunterJobsCompanyType,
	string
> = {
	[WillhabenHunterJobsCompanyType.PERSONALBERATUNG]: "agency",
	[WillhabenHunterJobsCompanyType.DIREKTER_ARBEITGEBER]: "direct_employer",
};

export enum WillhabenHunterJobsTimeLimit {
	ALLE = "alle",
	LETZTE_24_STUNDEN = "letzte_24_stunden",
	LETZTE_72_STUNDEN = "letzte_72_stunden",
	LETZTE_WOCHE = "letzte_woche",
}

export const WILLHABEN_HUNTER_JOBS_TIME_LIMIT_MAP: Record<WillhabenHunterJobsTimeLimit, string> = {
	[WillhabenHunterJobsTimeLimit.ALLE]: "all",
	[WillhabenHunterJobsTimeLimit.LETZTE_24_STUNDEN]: "last_24_hours",
	[WillhabenHunterJobsTimeLimit.LETZTE_72_STUNDEN]: "last_72_hours",
	[WillhabenHunterJobsTimeLimit.LETZTE_WOCHE]: "last_week",
};

export enum WillhabenHunterJobsEmploymentType {
	VOLLZEIT = "vollzeit",
	TEILZEIT = "teilzeit",
	FREIBERUFLICH = "freiberuflich",
	GERINGFUEGIG = "geringfügig",
}

export const WILLHABEN_HUNTER_JOBS_EMPLOYMENT_TYPE_MAP: Record<
	WillhabenHunterJobsEmploymentType,
	string
> = {
	[WillhabenHunterJobsEmploymentType.VOLLZEIT]: "110",
	[WillhabenHunterJobsEmploymentType.TEILZEIT]: "113",
	[WillhabenHunterJobsEmploymentType.FREIBERUFLICH]: "109",
	[WillhabenHunterJobsEmploymentType.GERINGFUEGIG]: "11796",
};

export enum WillhabenHunterJobsPosition {
	GRUPPEN_TEAMLEITUNG = "gruppen-/teamleitung",
	LEHRE = "lehre",
	LEITUNG_MANAGEMENT = "leitung/management",
	MITARBEITER_IN = "mitarbeiter:in",
	PRAKTIKUM = "praktikum",
	PROJEKTMANAGEMENT = "projektmanagement",
	TRAINEESHIP = "traineeship",
}

export const WILLHABEN_HUNTER_JOBS_POSITION_MAP: Record<WillhabenHunterJobsPosition, string> = {
	[WillhabenHunterJobsPosition.GRUPPEN_TEAMLEITUNG]: "13540",
	[WillhabenHunterJobsPosition.LEHRE]: "13541",
	[WillhabenHunterJobsPosition.LEITUNG_MANAGEMENT]: "13539",
	[WillhabenHunterJobsPosition.MITARBEITER_IN]: "13542",
	[WillhabenHunterJobsPosition.PRAKTIKUM]: "13543",
	[WillhabenHunterJobsPosition.PROJEKTMANAGEMENT]: "13544",
	[WillhabenHunterJobsPosition.TRAINEESHIP]: "28428",
};

export const WILLHABEN_HUNTER_JOBS_REGION_ID_MAP: Record<WillhabenHunterArea, string> = {
	[WillhabenHunterArea.BURGENLAND]: "13553",
	[WillhabenHunterArea.KAERNTEN]: "13602",
	[WillhabenHunterArea.NIEDEROESTERREICH]: "13677",
	[WillhabenHunterArea.OBEROESTERREICH]: "13859",
	[WillhabenHunterArea.SALZBURG]: "14096",
	[WillhabenHunterArea.STEIERMARK]: "13783",
	[WillhabenHunterArea.TIROL]: "14366",
	[WillhabenHunterArea.VORARLBERG]: "14445",
	[WillhabenHunterArea.WIEN]: "14486",
};
