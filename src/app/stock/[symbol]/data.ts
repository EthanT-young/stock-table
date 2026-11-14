import { cache } from "react";
import { getCompanyProfile, getDailyPrices } from "@/lib/stock-data";

// Several sections of the page need the same data (the header and the "Behind the ticker"
// card both use the profile; the chart and the table both use the prices). React's cache()
// makes repeated calls with the same symbol during one page render share one result.
export const loadProfile = cache(getCompanyProfile);
export const loadPrices = cache(getDailyPrices);
