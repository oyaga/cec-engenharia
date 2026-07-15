import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { EditProvider } from './context/EditContext'
import Login from './pages/Login'
import ScrollToTop from './components/ScrollToTop'
import ValidarCertificado from './pages/ValidarCertificado'

// Lazy loaded layout and components (reduces main bundle payload by splitting admin code)
const Layout = lazy(() => import('./components/Layout'))
const StudentLayout = lazy(() => import('./components/StudentLayout'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Alunos = lazy(() => import('./pages/Alunos'))
const Turmas = lazy(() => import('./pages/Turmas'))
const Financeiro = lazy(() => import('./pages/Financeiro'))
const Professor = lazy(() => import('./pages/Professor'))
const Auditoria = lazy(() => import('./pages/Auditoria'))
const ConfigDocs = lazy(() => import('./pages/ConfigDocs'))
const ConfigAsaas = lazy(() => import('./pages/ConfigAsaas'))
const AgenteMaria = lazy(() => import('./pages/AgenteMaria'))
const Equipe = lazy(() => import('./pages/Equipe'))
const Relatorios = lazy(() => import('./pages/Relatorios'))
const LMSAdmin = lazy(() => import('./pages/LMSAdmin'))
const AreaAluno = lazy(() => import('./pages/AreaAluno'))
const LessonPlayer = lazy(() => import('./pages/LessonPlayer'))
const ExamView = lazy(() => import('./pages/ExamView'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const EsqueciSenha = lazy(() => import('./pages/EsqueciSenha'))
const RedefinirSenha = lazy(() => import('./pages/RedefinirSenha'))
const MeuPerfil = lazy(() => import('./pages/MeuPerfil'))
const OuvidoriaAdmin = lazy(() => import('./pages/OuvidoriaAdmin'))
const TestimonialsAdmin = lazy(() => import('./pages/TestimonialsAdmin'))
const LeadsAdmin = lazy(() => import('./pages/LeadsAdmin'))
const AdminUsers = lazy(() => import('./pages/AdminUsers'))
const Instrutores = lazy(() => import('./pages/Instrutores'))
const Cursos = lazy(() => import('./pages/Cursos'))
const Matriculas = lazy(() => import('./pages/Matriculas'))
const Comunicados = lazy(() => import('./pages/Comunicados'))
const Certificados = lazy(() => import('./pages/Certificados'))
const StaffChat = lazy(() => import('./pages/StaffChat'))

// Public Site Pages
import Home from './pages/site/Home'
import AboutUs from './pages/site/AboutUs'
import Enrollment from './pages/site/Enrollment'
import Contact from './pages/site/Contact'
import Complaint from './pages/site/Complaint'
import Terms from './pages/site/Terms'
import Privacy from './pages/site/Privacy'
import CourseDetails from './pages/site/CourseDetails'
import CheckoutPage from './pages/checkout/CheckoutPage'

import { Outlet } from 'react-router-dom'
import './site-index.css'

const SiteLayout = () => {
  return (
    <div className="site-theme">
      <Outlet />
    </div>
  )
}

const PrivateRoute = ({ children }) => {
  const { session, userProfile, loading } = useAuth()
  
  if (loading) return <div className="p-8 text-center">Carregando perfil...</div>
  if (!session) return <Navigate to="/login" replace />
  
  if ((userProfile?.requires_password_change || userProfile?.must_change_password) && window.location.pathname !== '/trocar-senha') {
    return <Navigate to="/trocar-senha" replace />
  }

  return children
}

const RoleGuard = ({ children, allowedRoles, requiredPermission }) => {
  const { userProfile, loading } = useAuth()
  
  if (loading) return null
  
  const isDeveloper = userProfile?.email?.toLowerCase().includes('desenvolvedor') || userProfile?.email?.toLowerCase().includes('carlos')
  const hasPermission = requiredPermission && userProfile?.permissions?.[requiredPermission] === true
  
  // Coordenadores agora têm os mesmos privilégios do Admin e contam como bypass total
  const hasAccess = isDeveloper || userProfile?.role === 'admin' || userProfile?.role === 'coordenador' || hasPermission || (userProfile && allowedRoles.includes(userProfile.role))
  
  if (!hasAccess) {
    // If it's a student trying to access admin pages, redirect to student portal
    if (userProfile?.role === 'aluno') {
      return <Navigate to="/meus-cursos" replace />
    }
    // If it's an admin or collaborator trying to access unauthorized pages, redirect to dashboard
    return <Navigate to="/dashboard" replace />
  }

  return children
}

// Roteamento por subdomínio: aluno.* / secretaria.* / portal.* servem o mesmo
// app, mas a raiz de cada um abre direto o login do público certo (após o
// login, o redirect por role já leva cada um ao seu mundo). No domínio raiz
// (e em localhost/www), a raiz continua sendo o site público.
const PORTAL_SUBDOMAIN = (() => {
  const sub = window.location.hostname.split('.')[0]
  return ['aluno', 'secretaria', 'portal'].includes(sub) ? sub : null
})()

function RootByHost() {
  if (PORTAL_SUBDOMAIN === 'aluno') return <Login title="Portal do Aluno" />
  if (PORTAL_SUBDOMAIN === 'secretaria') return <Login title="Acesso Restrito - Secretaria" isSecretaria={true} redirectTo="/dashboard" />
  return <Login title="Portal do Professor" redirectTo="/professor" />
}

function App() {
  return (
    <AuthProvider>
      <EditProvider>
        <Router>
          <ScrollToTop />
          <Suspense fallback={
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100vh',
              fontFamily: 'sans-serif',
              gap: '1rem',
              backgroundColor: '#0f172a',
              color: '#ffffff'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid rgba(255,255,255,0.1)',
                borderTopColor: '#10b981',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <span>Carregando painel...</span>
              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          }>
            <Routes>
            {/* ROTAS DE ACESSO - PRIORIDADE MÁXIMA */}
            {PORTAL_SUBDOMAIN && <Route path="/" element={<RootByHost />} />}
            <Route path="/webdesigner" element={<Login title="Acesso Webdesigner - Editor do Site" isWebdesigner={true} redirectTo="/" />} />
            <Route path="/login" element={<Login title="Portal Educacional" />} />
            <Route path="/secretaria" element={<Login title="Acesso Restrito - Secretaria" isSecretaria={true} redirectTo="/dashboard" />} />
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />
            
            {/* Public Site Routes */}
            <Route element={<SiteLayout />}>
              {!PORTAL_SUBDOMAIN && <Route path="/" element={<Home />} />}
              <Route path="/sobre-nos" element={<AboutUs />} />
              <Route path="/matricular-se" element={<Enrollment />} />
              <Route path="/curso/:slug" element={<CourseDetails />} />
              <Route path="/checkout/:courseId" element={<CheckoutPage />} />
              <Route path="/contato" element={<Contact />} />
              <Route path="/ouvidoria" element={<Complaint />} />
              <Route path="/termos" element={<Terms />} />
              <Route path="/privacidade" element={<Privacy />} />
            </Route>
            
            <Route path="/validar-certificado/:id" element={<ValidarCertificado />} />
            
            <Route path="/trocar-senha" element={
              <PrivateRoute>
                <ResetPassword />
              </PrivateRoute>
            } />
            
            {/* Private App Routes (ADMIN / SECRETARIA) */}
            <Route element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }>
              {/* ADMIN ONLY ROUTES */}
              <Route path="/dashboard" element={<RoleGuard allowedRoles={['admin', 'coordenador', 'atendente']} requiredPermission="access_dashboard"><Dashboard /></RoleGuard>} />
              <Route path="/alunos" element={<RoleGuard allowedRoles={['admin', 'coordenador', 'atendente']} requiredPermission="access_alunos"><Alunos /></RoleGuard>} />
              <Route path="/secretaria/matriculas" element={<RoleGuard allowedRoles={['admin', 'coordenador', 'atendente']} requiredPermission="access_matriculas"><Matriculas /></RoleGuard>} />
              <Route path="/turmas" element={<RoleGuard allowedRoles={['admin', 'coordenador', 'atendente']} requiredPermission="access_turmas"><Turmas /></RoleGuard>} />
              <Route path="/secretaria/cursos" element={<RoleGuard allowedRoles={['admin', 'coordenador']} requiredPermission="access_cursos"><Cursos /></RoleGuard>} />
              <Route path="/financeiro" element={<RoleGuard allowedRoles={['admin', 'coordenador']} requiredPermission="access_financeiro"><Financeiro /></RoleGuard>} />
              <Route path="/relatorios" element={<RoleGuard allowedRoles={['admin', 'coordenador']} requiredPermission="access_relatorios"><Relatorios /></RoleGuard>} />
              <Route path="/professor" element={<RoleGuard allowedRoles={['admin', 'coordenador', 'instrutor']} requiredPermission="access_instrutor_portal"><Professor /></RoleGuard>} />
              <Route path="/auditoria" element={<RoleGuard allowedRoles={['admin', 'coordenador']} requiredPermission="access_auditoria"><Auditoria /></RoleGuard>} />
              <Route path="/ouvidoria-admin" element={<RoleGuard allowedRoles={['admin', 'coordenador']} requiredPermission="access_ouvidoria"><OuvidoriaAdmin /></RoleGuard>} />
              <Route path="/admin/testimonials" element={<RoleGuard allowedRoles={['admin', 'coordenador', 'atendente']} requiredPermission="access_dashboard"><TestimonialsAdmin /></RoleGuard>} />
              <Route path="/admin/users" element={<RoleGuard allowedRoles={['admin', 'coordenador', 'webdesigner']} requiredPermission="access_config"><AdminUsers /></RoleGuard>} />
              <Route path="/leads-admin" element={<RoleGuard allowedRoles={['admin', 'coordenador', 'atendente']} requiredPermission="access_leads"><LeadsAdmin /></RoleGuard>} />
              <Route path="/equipe" element={<RoleGuard allowedRoles={['admin', 'coordenador']} requiredPermission="access_equipe"><Equipe /></RoleGuard>} />
              <Route path="/secretaria/funcionarios" element={<RoleGuard allowedRoles={['admin', 'coordenador']} requiredPermission="access_equipe"><Equipe /></RoleGuard>} />
              <Route path="/lms" element={<RoleGuard allowedRoles={['admin', 'coordenador', 'administrativo']} requiredPermission="access_lms"><LMSAdmin /></RoleGuard>} />
              <Route path="/secretaria/comunicados" element={<RoleGuard allowedRoles={['admin', 'coordenador']} requiredPermission="access_comunicados"><Comunicados /></RoleGuard>} />
              <Route path="/secretaria/certificados" element={<RoleGuard allowedRoles={['admin', 'coordenador']} requiredPermission="access_certificados"><Certificados /></RoleGuard>} />
              <Route path="/secretaria/chat" element={<RoleGuard allowedRoles={['admin', 'coordenador', 'atendente', 'administrativo']} requiredPermission="access_dashboard"><StaffChat /></RoleGuard>} />
              <Route path="/config" element={<RoleGuard allowedRoles={['admin', 'coordenador']} requiredPermission="access_config"><ConfigDocs /></RoleGuard>} />
              <Route path="/config-asaas" element={<RoleGuard allowedRoles={['admin', 'coordenador']} requiredPermission="access_config_asaas"><ConfigAsaas /></RoleGuard>} />
              <Route path="/agente-maria" element={<RoleGuard allowedRoles={['admin', 'coordenador']} requiredPermission="access_config"><AgenteMaria /></RoleGuard>} />
              <Route path="/secretaria/instrutores" element={<RoleGuard allowedRoles={['admin', 'coordenador']} requiredPermission="access_instrutores"><Instrutores /></RoleGuard>} />
              <Route path="/secretaria/perfil" element={<RoleGuard allowedRoles={['admin', 'coordenador', 'atendente']}><MeuPerfil /></RoleGuard>} />
              <Route path="/professor/perfil" element={<RoleGuard allowedRoles={['instrutor']}><MeuPerfil /></RoleGuard>} />
            </Route>

            {/* Private App Routes (STUDENT PORTAL) */}
            <Route element={
              <PrivateRoute>
                <StudentLayout />
              </PrivateRoute>
            }>
              {/* STUDENT ROUTES */}
              <Route path="/meus-cursos" element={<Navigate to="/area-aluno/cursos" replace />} />
              
              <Route path="/area-aluno" element={<RoleGuard allowedRoles={['aluno', 'admin']}><AreaAluno /></RoleGuard>} />
              <Route path="/area-aluno/cursos" element={<RoleGuard allowedRoles={['aluno', 'admin']}><AreaAluno /></RoleGuard>} />
              <Route path="/area-aluno/ead" element={<RoleGuard allowedRoles={['aluno', 'admin']}><AreaAluno /></RoleGuard>} />
              <Route path="/area-aluno/presencial" element={<RoleGuard allowedRoles={['aluno', 'admin']}><AreaAluno /></RoleGuard>} />
              <Route path="/area-aluno/desempenho" element={<RoleGuard allowedRoles={['aluno', 'admin']}><AreaAluno /></RoleGuard>} />
              <Route path="/area-aluno/mensagens" element={<RoleGuard allowedRoles={['aluno', 'admin']}><AreaAluno /></RoleGuard>} />
              <Route path="/area-aluno/avisos" element={<RoleGuard allowedRoles={['aluno', 'admin']}><AreaAluno /></RoleGuard>} />
              <Route path="/area-aluno/forum" element={<RoleGuard allowedRoles={['aluno', 'admin']}><AreaAluno /></RoleGuard>} />
              <Route path="/area-aluno/financeiro" element={<RoleGuard allowedRoles={['aluno', 'admin']}><AreaAluno /></RoleGuard>} />
              <Route path="/area-aluno/documentos" element={<RoleGuard allowedRoles={['aluno', 'admin']}><AreaAluno /></RoleGuard>} />
              <Route path="/area-aluno/certificados" element={<RoleGuard allowedRoles={['aluno', 'admin']}><AreaAluno /></RoleGuard>} />
              <Route path="/area-aluno/vitrine" element={<RoleGuard allowedRoles={['aluno', 'admin']}><AreaAluno /></RoleGuard>} />
              
              <Route path="/curso/:courseId/aula/:lessonId" element={<RoleGuard allowedRoles={['aluno', 'admin']}><LessonPlayer /></RoleGuard>} />
              <Route path="/exame/:quizId" element={<RoleGuard allowedRoles={['aluno', 'admin']}><ExamView /></RoleGuard>} />
              <Route path="/aluno/perfil" element={<RoleGuard allowedRoles={['aluno']}><MeuPerfil /></RoleGuard>} />
            </Route>

            {/* Rota Pega-Tudo: Se não bater em nada, manda para o site principal */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          </Suspense>
        </Router>
      </EditProvider>
    </AuthProvider>
  )
}

export default App
