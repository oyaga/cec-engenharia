import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { EditProvider } from './context/EditContext'
import Layout from './components/Layout'
import StudentLayout from './components/StudentLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Alunos from './pages/Alunos'
import Turmas from './pages/Turmas'
import Financeiro from './pages/Financeiro'
import Professor from './pages/Professor'
import Auditoria from './pages/Auditoria'
import ConfigDocs from './pages/ConfigDocs'
import ConfigAsaas from './pages/ConfigAsaas'
import Equipe from './pages/Equipe'
import Relatorios from './pages/Relatorios'
import LMSAdmin from './pages/LMSAdmin'
import AreaAluno from './pages/AreaAluno'
import LessonPlayer from './pages/LessonPlayer'
import ExamView from './pages/ExamView'
import ResetPassword from './pages/ResetPassword'
import MeuPerfil from './pages/MeuPerfil'
import OuvidoriaAdmin from './pages/OuvidoriaAdmin'
import TestimonialsAdmin from './pages/TestimonialsAdmin'
import LeadsAdmin from './pages/LeadsAdmin'
import ScrollToTop from './components/ScrollToTop'
import AdminUsers from './pages/AdminUsers'
import Instrutores from './pages/Instrutores'
import ValidarCertificado from './pages/ValidarCertificado'
import Cursos from './pages/Cursos'
import Matriculas from './pages/Matriculas'
import Comunicados from './pages/Comunicados'
import Certificados from './pages/Certificados'

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
  
  if (userProfile?.requires_password_change && window.location.pathname !== '/trocar-senha') {
    return <Navigate to="/trocar-senha" replace />
  }

  return children
}

const RoleGuard = ({ children, allowedRoles }) => {
  const { userProfile, loading } = useAuth()
  
  if (loading) return null
  
  if (userProfile && !allowedRoles.includes(userProfile.role)) {
    // If it's a student trying to access admin pages, redirect to student portal
    if (userProfile.role === 'aluno') {
      return <Navigate to="/meus-cursos" replace />
    }
    // If it's an admin trying to access student pages, redirect to dashboard
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function App() {
  return (
    <AuthProvider>
      <EditProvider>
        <Router>
          <ScrollToTop />
          <Routes>
            {/* ROTAS DE ACESSO - PRIORIDADE MÁXIMA */}
            <Route path="/webdesigner" element={<Login title="Acesso Webdesigner - Editor do Site" isWebdesigner={true} redirectTo="/" />} />
            <Route path="/login" element={<Login title="Portal Educacional" />} />
            <Route path="/secretaria" element={<Login title="Acesso Restrito - Secretaria" isSecretaria={true} redirectTo="/dashboard" />} />
            
            {/* Public Site Routes */}
            <Route element={<SiteLayout />}>
              <Route path="/" element={<Home />} />
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
              <Route path="/dashboard" element={<RoleGuard allowedRoles={['admin', 'coordenador', 'atendente']}><Dashboard /></RoleGuard>} />
              <Route path="/alunos" element={<RoleGuard allowedRoles={['admin', 'coordenador', 'atendente']}><Alunos /></RoleGuard>} />
              <Route path="/secretaria/matriculas" element={<RoleGuard allowedRoles={['admin', 'coordenador', 'atendente']}><Matriculas /></RoleGuard>} />
              <Route path="/turmas" element={<RoleGuard allowedRoles={['admin', 'coordenador', 'atendente']}><Turmas /></RoleGuard>} />
              <Route path="/secretaria/cursos" element={<RoleGuard allowedRoles={['admin', 'coordenador']}><Cursos /></RoleGuard>} />
              <Route path="/financeiro" element={<RoleGuard allowedRoles={['admin', 'coordenador']}><Financeiro /></RoleGuard>} />
              <Route path="/relatorios" element={<RoleGuard allowedRoles={['admin', 'coordenador']}><Relatorios /></RoleGuard>} />
              <Route path="/professor" element={<RoleGuard allowedRoles={['admin', 'coordenador', 'instrutor']}><Professor /></RoleGuard>} />
              <Route path="/auditoria" element={<RoleGuard allowedRoles={['admin', 'coordenador']}><Auditoria /></RoleGuard>} />
              <Route path="/ouvidoria-admin" element={<RoleGuard allowedRoles={['admin']}><OuvidoriaAdmin /></RoleGuard>} />
              <Route path="/admin/testimonials" element={<RoleGuard allowedRoles={['admin']}><TestimonialsAdmin /></RoleGuard>} />
              <Route path="/admin/users" element={<RoleGuard allowedRoles={['admin']}><AdminUsers /></RoleGuard>} />
              <Route path="/leads-admin" element={<RoleGuard allowedRoles={['admin', 'coordenador', 'atendente']}><LeadsAdmin /></RoleGuard>} />
              <Route path="/equipe" element={<RoleGuard allowedRoles={['admin', 'coordenador']}><Equipe /></RoleGuard>} />
              <Route path="/secretaria/funcionarios" element={<RoleGuard allowedRoles={['admin', 'coordenador']}><Equipe /></RoleGuard>} />
              <Route path="/lms" element={<RoleGuard allowedRoles={['admin', 'coordenador']}><LMSAdmin /></RoleGuard>} />
              <Route path="/secretaria/comunicados" element={<RoleGuard allowedRoles={['admin', 'coordenador']}><Comunicados /></RoleGuard>} />
              <Route path="/secretaria/certificados" element={<RoleGuard allowedRoles={['admin', 'coordenador']}><Certificados /></RoleGuard>} />
              <Route path="/config" element={<RoleGuard allowedRoles={['admin']}><ConfigDocs /></RoleGuard>} />
              <Route path="/config-asaas" element={<RoleGuard allowedRoles={['admin', 'coordenador']}><ConfigAsaas /></RoleGuard>} />
               <Route path="/secretaria/instrutores" element={<RoleGuard allowedRoles={['admin', 'coordenador']}><Instrutores /></RoleGuard>} />
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
        </Router>
      </EditProvider>
    </AuthProvider>
  )
}

export default App
