import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const payload = await req.json()
    
    // O Asaas envia os eventos de webhook. O evento 'PAYMENT_RECEIVED' significa que foi pago.
    if (payload.event === 'PAYMENT_RECEIVED' || payload.event === 'PAYMENT_CONFIRMED') {
      const payment = payload.payment
      const enrollmentId = payment.externalReference

      if (!enrollmentId) {
        console.error("No externalReference found on payment:", payment.id)
        return new Response('OK', { status: 200 }) // Return 200 so Asaas doesn't retry
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
      if (enrollment.status === 'processed') return new Response('Already processed', { status: 200 })

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
        // Se o usuário já existe (ex: comprou outro curso), tentamos buscar o ID dele
        if (authError.message.includes('already registered')) {
          const { data: existingUsers } = await supabase.auth.admin.listUsers()
          const foundUser = existingUsers?.users?.find(u => u.email === enrollment.email)
          if (foundUser) userId = foundUser.id
        } else {
          throw authError
        }
      }

      if (userId) {
        // 3. Buscar a próxima turma disponível para este curso
        const today = new Date().toISOString().split('T')[0];
        const { data: nextClass } = await supabase
          .from('classes')
          .select('id')
          .ilike('course_name', `%${enrollment.course_name}%`)
          .gte('start_date', today)
          .order('start_date', { ascending: true })
          .limit(1)
          .single();

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
          turma_id: nextClass?.id || null // Vincula à turma se encontrada
        };

        await supabase.from('students').upsert(studentData, { onConflict: 'cpf' });

        // Atualiza a matrícula para "processada"
        await supabase.from('enrollments').update({ status: 'processed' }).eq('id', enrollmentId);

        // 5. Enviar E-mail de Boas Vindas / Convite
        const welcomeMsg = `Sua matrícula no curso ${enrollment.course_name} foi confirmada! ${nextClass ? 'Você foi vinculado à próxima turma.' : ''} Sua senha inicial é o seu CPF (apenas números).`;
        
        await supabase.auth.admin.inviteUserByEmail(enrollment.email, {
          data: { 
            full_name: enrollment.name,
            welcome_msg: welcomeMsg
          }
        });
      }

      return new Response('Processed successfully', { status: 200 })
    }

    return new Response('Ignored event', { status: 200 })
  } catch (error) {
    console.error("Webhook Error:", error.message)
    return new Response(error.message, { status: 500 }) // Return 500 so Asaas retries later
  }
})
