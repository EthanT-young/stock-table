import { cache } from "react";
import {
  getCompanyIdentity,
  getCompanyProfile,
  getDailyPrices,
} from "@/lib/stock-data";

// Several sections of the page need the same data (the chart and the table both use the
// prices). React's cache() makes repeated calls with the same symbol during one page
// render share one result.
//
// The header uses loadIdentity rather than loadProfile so it doesn't wait for prices and
// share counts. The two still share their OVERVIEW and LISTING_STATUS requests, because
// stock-data shares identical requests that are in progress at the same time.
export const loadIdentity = cache(getCompanyIdentity);
export const loadProfile = cache(getCompanyProfile);
export const loadPrices = cache(getDailyPrices);
