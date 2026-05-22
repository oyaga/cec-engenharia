import os

app_dir = '/Users/piticalyn/.gemini/antigravity/brain/22c3c852-b979-4b6a-aae7-5a4ad295d4bf'
md_path = os.path.join(app_dir, 'script_complementar.md')

files = [
    'supabase_api_n8n.sql',
    'supabase_enrollment_update.sql',
    'supabase_reset_password_func.sql',
    'supabase_storage_setup.sql'
]

content = "# Script Complementar (Arquivos Faltantes)\n\n"
content += "Esses 4 pequenos arquivos não haviam entrado no script gigante original. Copie o bloco abaixo e rode no seu SQL Editor para o seu banco ficar **100%** idêntico ao antigo:\n\n"
content += "```sql\n"

for f in files:
    if os.path.exists(f):
        with open(f, 'r') as file:
            content += f"-- CONTEÚDO DE {f}\n"
            content += file.read() + "\n\n"

content += "```\n"

with open(md_path, 'w') as f:
    f.write(content)

print("Complemento gerado!")
