import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env', 'utf8')
const supabaseUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim()
const supabaseKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim()

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
    const { data, error } = await supabase
        .from('site_content')
        .select('data')
        .eq('id', 'main-content')
        .single();
    if (error) {
        console.error("Erro ao carregar do banco:", error);
    } else {
        console.log("Conteúdo do banco carregado!");
        console.log("Número de cursos no banco:", data.data?.courses_section?.courses?.length);
        console.log("Cursos no banco:", data.data?.courses_section?.courses?.map(c => c.slug));
        console.log("Detalhes dos novos cursos no banco:");
        console.log("laser-tracker-caldeiraria:", !!data.data?.course_details?.['laser-tracker-caldeiraria']);
        console.log("retreinamento-teorico-cd-cl:", !!data.data?.course_details?.['retreinamento-teorico-cd-cl']);
        console.log("retreinamento-pratico-cd-cl:", !!data.data?.course_details?.['retreinamento-pratico-cd-cl']);
    }
}
run()
