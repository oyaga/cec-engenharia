import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env', 'utf8')
const supabaseUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim()
const supabaseKey = envFile.match(/VITE_SUPABASE_KEY=(.*)/)[1].trim()

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
    console.log('Promovendo todos os usuarios para admin...')
    const { data: users, error: selectError } = await supabase.from('users').select('id, email, full_name, role')
    if (selectError) {
        console.error('Erro ao buscar', selectError)
        return
    }

    for (const u of users) {
        console.log(`Atualizando ${u.email} para admin...`)
        await supabase.from('users').update({ role: 'admin' }).eq('id', u.id)
    }
    console.log('Pronto! Todos sao admin agora.')
}
run()
