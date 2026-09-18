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
let clientPromise = null;
function getClient() {
    if (!clientPromise) {
        clientPromise = import(
        /* webpackIgnore: true */ "https://esm.sh/@supabase/supabase-js@2"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ).then((mod) => mod.createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
    }
    return clientPromise;
}
/**
 * Upserts the customer (deduped on phone number) and inserts a new
 * booking row linked to them. Never throws — callers should still proceed
 * with the WhatsApp handoff even if the database save fails, so a flaky
 * connection never blocks a booking.
 */
export async function saveBookingToSupabase(customer, booking) {
    try {
        const supabase = await getClient();
        // 1. Upsert the customer, keyed on phone number.
        const { data: customerRow, error: customerError } = await supabase
            .from("customers")
            .upsert({
            first_name: customer.firstName,
            last_name: customer.lastName,
            phone: customer.phone,
            address: customer.address,
        }, { onConflict: "phone" })
            .select()
            .single();
        if (customerError)
            throw customerError;
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
        if (bookingError)
            throw bookingError;
        return { ok: true };
    }
    catch (err) {
        const message = err?.message ??
            err?.error_description ??
            (typeof err === "string" ? err : JSON.stringify(err));
        console.error("Failed to save booking to Supabase:", message);
        return { ok: false, error: message };
    }
}
// ---------------------------------------------------------------------
// DUMMY: Log what would be sent, without touching the database.
// Flip DRY_RUN to false to actually hit Supabase using the same shape.
// ---------------------------------------------------------------------
const DRY_RUN = false;
/**
 * Dummy tester for the customers + bookings insert flow.
 *
 * Usage from the browser console (after dist/supabase.js loads):
 *   await window.testSaveBookingToSupabase();
 *   await window.testSaveBookingToSupabase({ firstName: "Jane" }, { service: "Deep Clean" });
 */
export async function testSaveBookingToSupabase(customerOverrides = {}, bookingOverrides = {}) {
    // 1. Build a realistic customer payload.
    const customer = {
        firstName: "Test",
        lastName: "Customer",
        phone: "+27820000000",
        address: "123 Test Street, Cape Town",
        ...customerOverrides,
    };
    // 2. Build a realistic booking payload.
    const booking = {
        service: "Mowing",
        priceRange: "R500 - R800",
        serviceAddress: customer.address,
        preferredDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        instructions: "Please ring the bell twice.",
        pricingPreference: "Proceed with the estimate",
        budgetAmount: 650,
        ...bookingOverrides,
    };
    // 3. Shape it exactly like saveBookingToSupabase would.
    const customerRow = {
        first_name: customer.firstName,
        last_name: customer.lastName,
        phone: customer.phone,
        address: customer.address,
    };
    const bookingRow = {
        // customer_id is filled after the upsert in the real flow
        customer_id: "<filled after customer upsert>",
        service: booking.service,
        price_range: booking.priceRange,
        service_address: booking.serviceAddress,
        preferred_date: booking.preferredDate,
        instructions: booking.instructions,
        pricing_preference: booking.pricingPreference,
        budget_amount: booking.budgetAmount,
    };
    console.group("[TEST] Booking payload");
    console.log("Customer row  ->", customerRow);
    console.log("Booking row   ->", bookingRow);
    console.groupEnd();
    if (DRY_RUN) {
        console.info("[TEST] DRY_RUN=true — nothing sent to Supabase.");
        return { ok: true, dryRun: true, customerRow, bookingRow };
    }
    // 4. Actually run the real flow.
    console.info("[TEST] DRY_RUN=false — sending to Supabase…");
    const result = await saveBookingToSupabase(customer, booking);
    console.log("[TEST] Supabase result ->", result);
    return result;
}
// Expose for console testing.
window.testSaveBookingToSupabase = testSaveBookingToSupabase;
window.saveBookingToSupabase = saveBookingToSupabase;
