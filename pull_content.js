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

const envFile = fs.readFileSync(envPath, 'utf8')
const supabaseUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim()
const supabaseKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim()

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
    console.log("Conectando ao Supabase:", supabaseUrl)
    const { data, error } = await supabase
        .from('site_content')
        .select('data')
        .eq('id', 'main-content')
        .single();
        
    if (error) {
        console.error("Erro ao buscar dados do Supabase:", error)
        process.exit(1)
    }
    
    if (!data || !data.data) {
        console.error("Nenhum dado encontrado ou coluna 'data' vazia.")
        process.exit(1)
    }
    
    console.log("Dados recebidos com sucesso!")
    console.log("Hero Image/Video no banco:", data.data.hero?.image)
    
    // Ler o content.json atual para comparar
    let localContent = {}
    if (fs.existsSync(contentPath)) {
        try {
            localContent = JSON.parse(fs.readFileSync(contentPath, 'utf8'))
            console.log("Hero Image/Video local atual:", localContent.hero?.image)
        } catch (e) {
            console.warn("Erro ao ler content.json local:", e.message)
        }
    }
    
    // Salvar o novo JSON no content.json
    fs.writeFileSync(contentPath, JSON.stringify(data.data, null, 2), 'utf8')
    console.log("Arquivo content.json atualizado com sucesso em:", contentPath)
}

run().catch(err => {
    console.error("Erro nao tratado no script:", err)
})
