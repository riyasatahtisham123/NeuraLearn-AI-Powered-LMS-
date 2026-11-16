import { Link, useLocation } from 'react-router-dom'
import { Compass, ArrowLeft, LayoutDashboard, BookOpen, Sparkles } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { Panel, Empty } from '../components/ui.jsx'

export default function NotFound() {
  const { user } = useStore()
  const { pathname } = useLocation()
  const home = user?.role === 'admin' ? '/admin' : '/'

  return (
    <Panel className="reveal">
      <Empty icon={Compass} title="This page does not exist"
        action={
          <div className="row gap8 wrap mt16" style={{ justifyContent: 'center' }}>
            <Link className="btn btn-primary" to={home}><LayoutDashboard /> {user?.role === 'admin' ? 'Admin dashboard' : 'My dashboard'}</Link>
            <Link className="btn btn-outline" to={user?.role === 'admin' ? '/admin/content' : '/courses'}><BookOpen /> {user?.role === 'admin' ? 'Content manager' : 'Courses'}</Link>
            {user?.role !== 'admin' && <Link className="btn btn-ghost" to="/recommendations"><Sparkles /> AI recommendations</Link>}
          </div>
        }>
        <span className="mono">{pathname}</span> is not a route in this system. Use the sidebar, or press
        <kbd> Ctrl</kbd> + <kbd>K</kbd> to search pages, topics and resources.
      </Empty>
      <div className="center mt16">
        <Link className="btn btn-sm btn-ghost" to={home}><ArrowLeft /> Back to safety</Link>
      </div>
    </Panel>
  )
}