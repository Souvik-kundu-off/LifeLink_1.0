import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the function
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the user from the JWT token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user is a hospital admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role, hospital_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'hospital_admin') {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Only hospital admins can verify blood requests.' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the request body
    const { request_id } = await req.json()

    if (!request_id) {
      return new Response(
        JSON.stringify({ error: 'request_id is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify that the blood request belongs to this hospital admin's hospital
    const { data: request, error: requestError } = await supabaseClient
      .from('blood_requests')
      .select('*')
      .eq('id', request_id)
      .eq('hospital_id', profile.hospital_id)
      .single()

    if (requestError || !request) {
      return new Response(
        JSON.stringify({ error: 'Blood request not found or does not belong to your hospital' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update the blood request status to active
    const { data, error } = await supabaseClient
      .from('blood_requests')
      .update({ status: 'active' })
      .eq('id', request_id)
      .select()

    if (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to verify blood request', details: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Blood request verified successfully',
        request: data[0]
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
