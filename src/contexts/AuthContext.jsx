import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null)
    const [userProfile, setUserProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchProfile = async (sessionData) => {
            try {
                if (sessionData?.user) {
                    const { data, error } = await supabase.from('users').select('*').eq('id', sessionData.user.id).maybeSingle()
                    
                    if (error) throw error;

                    if (data?.role === 'aluno') {
                        const { data: studentData } = await supabase.from('students').select('requires_password_change').eq('user_id', sessionData.user.id).maybeSingle()
                        setUserProfile({ ...data, requires_password_change: studentData?.requires_password_change })
                    } else {
                        setUserProfile(data || null)
                    }
                } else {
                    setUserProfile(null)
                }
            } catch (err) {
                console.error("Erro ao carregar perfil:", err)
                setUserProfile(null)
            } finally {
                setLoading(false)
            }
        }

        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            fetchProfile(session)
        }).catch(() => setLoading(false))

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            fetchProfile(session)
        })

        return () => subscription.unsubscribe()
    }, [])

    return (
        <AuthContext.Provider value={{ session, userProfile, loading }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
