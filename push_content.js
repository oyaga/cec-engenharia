import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const projectDir = '.'
const envPath = path.join(projectDir, '.env')
const contentPath = path.join(projectDir, 'src/data/content.json')

if (!fs.existsSync(envPath)) {
    console.error("Arquivo .env nao encontrado em:", envPath)
    process.exit(1)
}

if (!fs.existsSync(contentPath)) {
    console.error("Arquivo content.json nao encontrado em:", contentPath)
    process.exit(1)
}

const envFile = fs.readFileSync(envPath, 'utf8')
const supabaseUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim()
const supabaseKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim()

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
    console.log("Conectando ao Supabase para enviar dados:", supabaseUrl)
    
    // Fazer login como admin para passar pela RLS
    console.log("Realizando login como admin...")
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'admin@cec.com.br',
        password: 'CEC@admin2026!'
    })
    
    if (authError) {
        console.error("Erro ao autenticar administrador:", authError.message)
        process.exit(1)
    }
    
    console.log("Autenticado com sucesso como:", authData.user?.email)
    
    // Ler o content.json local
    const localContent = JSON.parse(fs.readFileSync(contentPath, 'utf8'))
    console.log("Conteudo local lido com sucesso.")
    
    // Atualizar no Supabase
    const { error } = await supabase
        .from('site_content')
        .upsert({ id: 'main-content', data: localContent });
        
    if (error) {
        console.error("Erro ao salvar dados no Supabase:", error)
        process.exit(1)
    }
    
    console.log("Banco de dados do Supabase atualizado online com sucesso com os dados locais!")
}

run().catch(err => {
    console.error("Erro nao tratado no script de push:", err)
})
