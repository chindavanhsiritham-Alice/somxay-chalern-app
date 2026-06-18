import { createClient } from '@/lib/supabase/server'
import { getRates, RATE_PAIRS } from '@/lib/exchangeRates'
import RatesEditor from './RatesEditor'

export default async function ExchangeRatesPage() {
  const supabase = await createClient()
  const rates = await getRates(supabase)

  return <RatesEditor initial={RATE_PAIRS.map((pair) => rates[pair])} />
}
