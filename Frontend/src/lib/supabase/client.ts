import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
      "https://hedvozvzecathccvbbff.supabase.co",
    "sb_publishable_4CUmdLQOGrT7ustIK-AYdQ_0xO6h007"
  )
}
