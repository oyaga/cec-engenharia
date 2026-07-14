package auth

import "golang.org/x/crypto/bcrypt"

// HashPassword gera um hash bcrypt (compatível com o formato do GoTrue/Supabase,
// o que permite futura importação dos hashes existentes — ver §4 do plano).
func HashPassword(plain string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	return string(b), err
}

// CheckPassword compara a senha em texto com o hash armazenado.
func CheckPassword(hash, plain string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain)) == nil
}
