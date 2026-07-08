// Canonical catalog of purchasable ticket products.

// TODO: For now I hardcoded to USD, but we may want to support CRC.
// I don't know if Stripe supports it but will see later if I can make it work.
export const CURRENCY = 'USD';

// Shape returned to clients.
export type TicketProduct = {
  id: string;
  label: string;
  amountMinor: number; // Stripe processes API amounts in the minor unit
  currency: string;
};

// Internal catalog entry: the product fields, plus the Google place types it applies
// to. (TicketProduct is the same fields but with `currency` instead of `appliesToTypes`.)
interface CatalogEntry {
  id: string;
  label: string;
  amountMinor: number;
  appliesToTypes: string[];
};

const CATALOG: CatalogEntry[] = [
  { id: 'national_park.day', label: 'Day Pass', amountMinor: 1000, appliesToTypes: ['national_park'] },
  { id: 'national_park.annual', label: 'Annual Pass', amountMinor: 6000, appliesToTypes: ['national_park'] },
  { id: 'state_park.day', label: 'Day Pass', amountMinor: 800, appliesToTypes: ['state_park'] },
  { id: 'city_park.day', label: 'Day Pass', amountMinor: 500, appliesToTypes: ['city_park'] },
  { id: 'park.day', label: 'Day Pass', amountMinor: 500, appliesToTypes: ['park'] },
  { id: 'tourist_attraction.general', label: 'General Admission', amountMinor: 1500, appliesToTypes: ['tourist_attraction'] },
  { id: 'visitor_center.general', label: 'General Admission', amountMinor: 700, appliesToTypes: ['visitor_center'] },
  { id: 'campground.night', label: 'Campsite — 1 night', amountMinor: 2500, appliesToTypes: ['campground'] },
  { id: 'rv_park.night', label: 'Campsite — 1 night', amountMinor: 3500, appliesToTypes: ['rv_park'] },
];

// Build the public product from an entry: add the currency, drop appliesToTypes.
const toProduct = (entry: CatalogEntry): TicketProduct => ({
  id: entry.id,
  label: entry.label,
  amountMinor: entry.amountMinor,
  currency: CURRENCY,
});

// Every product offered for any of the given Google place types, as TicketProducts.
export const productsForTypes = (types: string[]): TicketProduct[] =>
  CATALOG
    .filter((entry) => entry.appliesToTypes.some((type) => types.includes(type)))
    .map(toProduct);

export const productById = (id: string): TicketProduct | null => {
  const entry = CATALOG.find((entry) => entry.id === id);
  return entry ? toProduct(entry) : null;
};
