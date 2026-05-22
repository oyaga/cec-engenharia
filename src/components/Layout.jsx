import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import WhatsAppChat from './WhatsAppChat'

export default function Layout() {
    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <header className="topbar">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Visão Geral
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                            A
                        </div>
                    </div>
                </header>
                <main className="content-area">
                    <Outlet />
                </main>
            </div>
            <WhatsAppChat />
        </div>
    )
}
