import os

app_dir = '/Users/piticalyn/.gemini/antigravity/brain/22c3c852-b979-4b6a-aae7-5a4ad295d4bf'
md_path = os.path.join(app_dir, 'script_mestre.md')

# ORDEM ABSOLUTA E DEFINITIVA
files = [
    # 1. Tabelas Base e Setups Iniciais
    'supabase_setup.sql',
    'supabase_lms_setup.sql',
    'supabase_lms_images_setup.sql',
    'supabase_docs_setup.sql',
    'supabase_pricing_setup.sql',
    'supabase_student_auth.sql',
    'supabase_class_instructors.sql',
    'supabase_question_bank.sql',
    'supabase_lms_quiz_types.sql',
    'supabase_create_storage.sql',
    
    # 2. Atualizações de Fase (Alters em Tabelas Base)
    'supabase_fase7_update.sql',
    'supabase_fase9_update.sql',
    'supabase_fase10_update.sql',
    'supabase_fase12_update.sql',
    'supabase_fase13_update.sql',
    'supabase_fase14_update.sql',
    'supabase_fase16_update.sql',
    'supabase_fase17_ai_pricing_update.sql',
    
    # 3. Atualizações Adicionais e Financeiro
    'supabase_financial_updates.sql',
    'supabase_financial_updates_ead.sql',
    'supabase_lms_time_control.sql',
    'supabase_lms_time_tracking.sql',
    
    # 4. Correções e Fixes Finais (Bugs e RLS)
    'supabase_fix_quiz_results.sql',
    'supabase_lms_v3_updates.sql',
    'supabase_lms_rls_fix.sql',
    'supabase_fix_classes_payment.sql',
    'supabase_fix_lms_courses_payment.sql',
    'supabase_schema_correction.sql',
    
    # 5. Seeds e Migrações de Dados
    'supabase_update_hours.sql',
    'supabase_update_turmas.sql',
    'supabase_students_auth_migration.sql',
    'supabase_seed_users.sql'
]

# Create MASTER
with open('MASTER_DATABASE_SETUP.sql', 'w') as out_f:
    for f in files:
        if os.path.exists(f):
            out_f.write(open(f).read() + '\n\n')

# Create MD
with open('MASTER_DATABASE_SETUP.sql', 'r') as f:
    sql_content = f.read()

content = f"""# Script Mestre do Supabase Completo (Ordem Perfeita)

Dessa vez todas as tabelas (incluindo o LMS) serão criadas **antes** de tentarmos adicionar as colunas novas nelas.
Copie todo o bloco abaixo e cole no SQL Editor.

```sql
{sql_content}
```
"""

with open(md_path, 'w') as f:
    f.write(content)

print("Master Script gerado com sucesso!")
