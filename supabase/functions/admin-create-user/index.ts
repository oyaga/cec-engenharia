import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify Admin authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error("Missing Authorization header")

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: verifyError } = await supabase.auth.getUser(token)
    if (verifyError || !user) throw new Error("Unauthorized")

    // Check if the user is an admin or coordenador
    const { data: adminUser } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (!adminUser || !['admin', 'coordenador', 'atendente'].includes(adminUser.role)) {
      throw new Error("Forbidden: insufficient permissions")
    }

    const { action, email, name, cpf, phone, userId } = await req.json()

    // Handle Reset Password Action
    if (action === 'reset') {
      if (!userId || !cpf) throw new Error("userId and cpf are required for reset")
      
      const cpfPassword = cpf.replace(/\D/g, '')
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: cpfPassword
      })
      if (updateError) throw updateError

      // Set requires_password_change to true
      await supabase.from('students').update({ requires_password_change: true }).eq('user_id', userId)

      return new Response(JSON.stringify({ success: true, message: "Password reset successfully" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Default Action: Create User
    if (!email || !cpf) throw new Error("Email and CPF are required")

    const cpfPassword = cpf.replace(/\D/g, '')
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: cpfPassword,
      email_confirm: true,
      user_metadata: { name }
    })

    if (authError) throw authError

    const newUserId = authUser.user.id

    // Update public.users
    await supabase.from('users').upsert({
      id: newUserId,
      email,
      full_name: name,
      role: 'aluno'
    })

    return new Response(JSON.stringify({ userId: newUserId, success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
