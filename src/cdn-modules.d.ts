// Lets TypeScript accept the runtime CDN import in supabase.ts without
// needing @supabase/supabase-js installed as a compile-time dependency.
declare module "https://esm.sh/@supabase/supabase-js@2" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function createClient(url: string, key: string): any;
}
