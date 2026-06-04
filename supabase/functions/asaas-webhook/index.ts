import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Tratar requisição preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    
    // O Asaas envia os eventos de webhook. O evento 'PAYMENT_RECEIVED' significa que foi pago.
    if (payload.event === 'PAYMENT_RECEIVED' || payload.event === 'PAYMENT_CONFIRMED') {
      const payment = payload.payment
      const enrollmentId = payment.externalReference

      if (!enrollmentId) {
        console.error("No externalReference found on payment:", payment.id)
        return new Response('OK', { status: 200, headers: corsHeaders }) // Return 200 so Asaas doesn't retry
      }

      // Initialize Supabase Client with SERVICE_ROLE key to bypass RLS
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      // 1. Obter a matrícula do Supabase
      const { data: enrollment, error: enrollError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('id', enrollmentId)
        .single()

      if (enrollError || !enrollment) throw new Error("Enrollment not found")

      // Se já foi processada, ignorar
      if (enrollment.status === 'processed') return new Response('Already processed', { status: 200, headers: corsHeaders })

      // 2. Criar Usuário no Auth
      const cpfPassword = enrollment.cpf ? enrollment.cpf.replace(/\D/g, '') : 'mudar123'
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: enrollment.email,
        password: cpfPassword,
        email_confirm: true,
        user_metadata: { name: enrollment.name }
      })

      let userId = authUser?.user?.id
      
      if (authError) {
        // Se der erro de criação, tentamos ativamente obter o ID do usuário existente pelo email
        const { data: dbUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', enrollment.email)
          .maybeSingle()
        
        if (dbUser) {
          userId = dbUser.id
        } else {
          // Se não achou na tabela public.users, tenta buscar na lista do Auth
          const { data: existingUsers } = await supabase.auth.admin.listUsers()
          const foundUser = existingUsers?.users?.find(u => u.email === enrollment.email)
          if (foundUser) {
            userId = foundUser.id
          } else {
            // Se realmente não achou o ID do usuário em lugar nenhum, lança o erro original de criação
            throw authError
          }
        }
      }

      if (userId) {
        // 3. Definir a turma: prioriza a turma_id escolhida no site, com fallback para a próxima disponível
        let finalTurmaId = enrollment.turma_id;
        
        if (!finalTurmaId) {
          const today = new Date().toISOString().split('T')[0];
          const { data: nextClass } = await supabase
            .from('classes')
            .select('id')
            .ilike('course_name', `%${enrollment.course_name}%`)
            .gte('start_date', today)
            .order('start_date', { ascending: true })
            .limit(1)
            .single();
          
          if (nextClass) {
            finalTurmaId = nextClass.id;
          }
        }

        // 4. Atualizar public.users e public.students
        await supabase.from('users').upsert({
          id: userId,
          email: enrollment.email,
          full_name: enrollment.name,
          role: 'aluno'
        });

        const studentData = {
          user_id: userId,
          full_name: enrollment.name,
          email: enrollment.email,
          phone: enrollment.phone,
          cpf: enrollment.cpf,
          requires_password_change: true,
          has_lms_access: true, // Libera acesso EAD automaticamente
          turma_id: finalTurmaId || null
        };

        await supabase.from('students').upsert(studentData, { onConflict: 'cpf' });

        // Atualiza a matrícula para "processada"
        await supabase.from('enrollments').update({ status: 'processed' }).eq('id', enrollmentId);

        // 5. Enviar E-mail de Boas Vindas / Convite
        // Buscar informações da turma para o e-mail de boas-vindas se vinculada
        let classNameText = '';
        if (finalTurmaId) {
          const { data: classData } = await supabase
            .from('classes')
            .select('name')
            .eq('id', finalTurmaId)
            .single();
          if (classData) {
            classNameText = ` na turma ${classData.name}`;
          }
        }

        const welcomeMsg = `Sua matrícula no curso ${enrollment.course_name}${classNameText} foi confirmada! Sua senha inicial é o seu CPF (apenas números).`;
        
        await supabase.auth.admin.inviteUserByEmail(enrollment.email, {
          data: { 
            full_name: enrollment.name,
            welcome_msg: welcomeMsg
          }
        });
      }

      return new Response('Processed successfully', { status: 200, headers: corsHeaders })
    }

    return new Response('Ignored event', { status: 200, headers: corsHeaders })
  } catch (error) {
    console.error("Webhook Error:", error.message)
    return new Response(error.message, { status: 500, headers: corsHeaders }) // Return 500 so Asaas retries later
  }
})
