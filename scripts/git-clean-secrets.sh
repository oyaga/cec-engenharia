#!/usr/bin/env bash
# =====================================================================
# Limpeza de segredos do histórico git (corrige C6).
# ATENÇÃO: reescreve o histórico — DESTRUTIVO. Exige force-push e que
# todos os clones sejam recriados. Rode só com autorização e backup.
#
# Requer: git-filter-repo  (pip install git-filter-repo)
# =====================================================================
set -euo pipefail

echo ">> Fazendo backup do repo atual em ../cec-site-backup-git"
git bundle create ../cec-site-backup.bundle --all

# Arquivos/segredos a expurgar de TODO o histórico:
#  - service_role demo commitada
#  - arquivos .env disfarçados de imagem
#  - workflows n8n com anon key
cat > /tmp/paths-to-remove.txt <<'EOF'
create_users.cjs
fix_users.cjs
logo.png
public/logo_cec.png
EOF

echo ">> Removendo arquivos sensíveis do histórico..."
git filter-repo --invert-paths --paths-from-file /tmp/paths-to-remove.txt --force

# Remover a pasta de workflows n8n do histórico (continha anon key)
git filter-repo --invert-paths --path "maria antonia/" --force

echo ""
echo ">> Histórico reescrito. Próximos passos MANUAIS:"
echo "   1) Revisar: git log --stat | less"
echo "   2) git remote add origin <url>   (filter-repo remove o remote)"
echo "   3) git push --force --all         (COORDENAR com o time antes!)"
echo "   4) git push --force --tags"
echo "   5) ROTACIONAR todas as chaves que já passaram pelo git:"
echo "      - anon key do Supabase (ao desativar o projeto)"
echo "      - qualquer JWT secret que tenha usado o secret demo do supabase-demo"
echo ""
echo ">> Backup salvo em ../cec-site-backup.bundle (restaure com: git clone cec-site-backup.bundle)"
