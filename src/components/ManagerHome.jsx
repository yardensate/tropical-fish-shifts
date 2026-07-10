import { useState } from 'react'
import BoardTab from './BoardTab.jsx'
import RequestsTab from './RequestsTab.jsx'
import HoursTab from './HoursTab.jsx'
import PeopleTab from './PeopleTab.jsx'
import EmployeeHome from './EmployeeHome.jsx'
import { getPendingRequests } from '../lib/api.js'
import { useLoad } from '../lib/useLoad.js'
import { useRefresh } from '../lib/refresh.js'

const TABS = [
  { id: 'board', label: 'לוח משמרות' },
  { id: 'requests', label: 'בקשות' },
  { id: 'hours', label: 'שעות' },
  { id: 'people', label: 'עובדים' },
  { id: 'mine', label: 'המשמרות שלי' },
]

export default function ManagerHome({ user }) {
  const { tick } = useRefresh()
  const [tab, setTab] = useState('board')
  const { data: pending } = useLoad(() => getPendingRequests(), [tick])
  const pendingCount = pending?.length ?? 0

  return (
    <>
      <nav className="tabs" aria-label="תפריט מנהל">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'requests' && pendingCount > 0 && <span className="tab-badge">{pendingCount}</span>}
          </button>
        ))}
      </nav>
      {tab === 'board' && <BoardTab user={user} />}
      {tab === 'requests' && <RequestsTab user={user} requests={pending || []} />}
      {tab === 'hours' && <HoursTab />}
      {tab === 'people' && <PeopleTab user={user} />}
      {tab === 'mine' && <EmployeeHome user={user} embedded />}
    </>
  )
}
