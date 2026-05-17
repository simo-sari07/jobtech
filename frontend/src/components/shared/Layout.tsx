/**
 * Layout — main dashboard shell with sidebar + topbar + content.
 */
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useUIStore } from '@/store/uiStore'

interface LayoutProps {
  title?: string
  subtitle?: string
}

export default function Layout({ title = 'Dashboard', subtitle }: LayoutProps) {
  const { sidebarCollapsed } = useUIStore()
  const margin = sidebarCollapsed ? '64px' : '256px'

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div
        className="flex-1 flex flex-col min-h-screen transition-all duration-200"
        style={{ marginLeft: margin }}
      >
        <Topbar title={title} subtitle={subtitle} />
        <main className="flex-1 p-6 animate-fade-up">
          <Outlet />
       
        </main>
      </div>
    </div>
  )
}
