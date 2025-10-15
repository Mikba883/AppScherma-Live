import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Running close_old_tournaments function...')

    // 1. Get tournaments older than 24h that are still in_progress
    const { data: oldTournaments, error: fetchError } = await supabase
      .from('tournaments')
      .select('id')
      .eq('status', 'in_progress')
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if (fetchError) {
      console.error('Error fetching old tournaments:', fetchError)
      throw fetchError
    }

    console.log(`Found ${oldTournaments?.length || 0} old tournaments to close`)

    if (oldTournaments && oldTournaments.length > 0) {
      const tournamentIds = oldTournaments.map(t => t.id)

      // 2. Cancel all non-approved bouts from these tournaments
      const { error: boutsError } = await supabase
        .from('bouts')
        .update({ status: 'cancelled' })
        .in('tournament_id', tournamentIds)
        .neq('status', 'approved')

      if (boutsError) {
        console.error('Error deleting bouts:', boutsError)
        throw boutsError
      }

      // 3. Mark tournaments as cancelled
      const { error: updateError } = await supabase
        .from('tournaments')
        .update({ status: 'cancelled' })
        .in('id', tournamentIds)

      if (updateError) {
        console.error('Error updating tournaments:', updateError)
        throw updateError
      }

      console.log(`Successfully closed ${tournamentIds.length} old tournaments`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Old tournaments closed successfully',
        closed_count: oldTournaments?.length || 0
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error: any) {
    console.error('Error in close-old-tournaments function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }, 
        status: 500 
      }
    )
  }
})