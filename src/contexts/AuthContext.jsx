import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authApi, getToken, setToken, clearToken } from '../lib/api'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
    const [userProfile, setUserProfile] = useState(null)
    const [token, setTokenState] = useState(() => getToken())
    const [loading, setLoading] = useState(true)

    // Carrega o perfil a partir do token existente (persistência de sessão).
    const loadProfile = useCallback(async () => {
        if (!getToken()) {
            setUserProfile(null)
            setLoading(false)
            return
        }
        try {
            const { user } = await authApi.me()
            setUserProfile(user)
        } catch (err) {
            console.warn('Sessão inválida/expirada:', err.message)
            clearToken()
            setUserProfile(null)
            setTokenState(null)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { loadProfile() }, [loadProfile])

    const login = useCallback(async (email, password, remember = false) => {
        const { token: jwt, user } = await authApi.login(email, password)
        setToken(jwt, remember)
        setTokenState(jwt)
        setUserProfile(user)
        return user
    }, [])

    const logout = useCallback(() => {
        clearToken()
        setTokenState(null)
        setUserProfile(null)
    }, [])

    // Objeto `session` de compatibilidade: mantém a forma que as páginas
    // legadas esperam (session.user.id / session.access_token) enquanto elas
    // não são migradas domínio a domínio.
    const session = token && userProfile
        ? { user: { id: userProfile.id, email: userProfile.email }, access_token: token }
        : null

    return (
        <AuthContext.Provider value={{ session, userProfile, loading, login, logout, refresh: loadProfile }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
