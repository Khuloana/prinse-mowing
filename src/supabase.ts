// src/supabase.ts
//
// Saves each booking to Supabase, then hands off to WhatsApp.
// Compiled to dist/supabase.js (plain ES module) — see README.md for the
// build command. Loaded in index.html via:
//   <script type="module" src="dist/supabase.js"></script>
//
// It attaches window.saveBookingToSupabase so the existing plain-JS
// submitBooking() function in index.html can call it without needing to
// become a module itself.

// ---------------------------------------------------------------------
// Fill these in from your Supabase project: Settings > API
// The anon/public key is safe to ship in client-side code as long as
// Row Level Security policies are set up correctly (see README.md).
// ---------------------------------------------------------------------
const SUPABASE_URL = "https://smjimvfunsvbybtouhvq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtamltdmZ1bnN2YnlidG91aHZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3MDg5NzMsImV4cCI6MjEwNTI4NDk3M30.7AHcjnu1a1L248v9PTCd4xO6Bm5VAjJKyvep4zbZpwI";
// ---------------------------------------------------------------------

export interface CustomerInput {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
}

export interface BookingInput {
  service: string;
  priceRange: string;
  serviceAddress: string;
  preferredDate: string; // ISO 8601 string
  instructions: string;
  pricingPreference: string;
  budgetAmount: number | null;
}

export interface SaveBookingResult {
  ok: boolean;
  error?: string;
}

// The Supabase JS client is loaded from a CDN at runtime rather than
// bundled, so this stays a zero-dependency, buildless-friendly module.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

let clientPromise: Promise<SupabaseClient> | null = null;

function getClient(): Promise<SupabaseClient> {
  if (!clientPromise) {
    clientPromise = import(
      /* webpackIgnore: true */ "https://esm.sh/@supabase/supabase-js@2"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ).then((mod: any) => mod.createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
  }
  return clientPromise;
}

/**
 * Upserts the customer (deduped on phone number) and inserts a new
 * booking row linked to them. Never throws — callers should still proceed
 * with the WhatsApp handoff even if the database save fails, so a flaky
 * connection never blocks a booking.
 */
export async function saveBookingToSupabase(
  customer: CustomerInput,
  booking: BookingInput
): Promise<SaveBookingResult> {
  try {
    const supabase = await getClient();

    // 1. Upsert the customer, keyed on phone number.
    const { data: customerRow, error: customerError } = await supabase
      .from("customers")
      .upsert(
        {
          first_name: customer.firstName,
          last_name: customer.lastName,
          phone: customer.phone,
          address: customer.address,
        },
        { onConflict: "phone" }
      )
      .select()
      .single();

    if (customerError) throw customerError;

    // 2. Insert the booking, linked to that customer.
    const { error: bookingError } = await supabase.from("bookings").insert({
      customer_id: customerRow.id,
      service: booking.service,
      price_range: booking.priceRange,
      service_address: booking.serviceAddress,
      preferred_date: booking.preferredDate,
      instructions: booking.instructions,
      pricing_preference: booking.pricingPreference,
      budget_amount: booking.budgetAmount,
    });

    if (bookingError) throw bookingError;

    return { ok: true };
  } catch (err: any) {
    const message =
      err?.message ??
      err?.error_description ??
      (typeof err === "string" ? err : JSON.stringify(err));
    console.error("Failed to save booking to Supabase:", message);
    return { ok: false, error: message };
  }
}

declare global {
  interface Window {
    saveBookingToSupabase: typeof saveBookingToSupabase;
  }
}

// Expose for the plain-JS submitBooking() in index.html.
window.saveBookingToSupabase = saveBookingToSupabase;
