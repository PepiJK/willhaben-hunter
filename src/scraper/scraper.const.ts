/**
 * Enum representing all Austrian areas (Bundesländer).
 */
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
