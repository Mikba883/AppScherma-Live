import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      'https://topkzcumjilaxbprufyo.supabase.co',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Close all tournaments with status 'in_progress' by setting them to 'cancelled'
    const { data, error } = await supabaseClient
      .from('tournaments')
      .update({ status: 'cancelled' })
      .eq('status', 'in_progress')
      .select('id, name, tournament_date, status');

    if (error) {
      console.error('Error closing tournaments:', error);
      throw error;
    }

    console.log(`Successfully closed ${data?.length || 0} tournaments`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Chiusi ${data?.length || 0} tornei`,
        tournaments: data,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in close-all-tournaments function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
