import FishLogo from './FishLogo.jsx'

export default function Header({ user, onLogout }) {
  return (
    <header className="appbar">
      <div className="appbar-inner">
        <FishLogo size={42} />
        <div className="appbar-user">
          <span className="appbar-name">
            {user.first_name} {user.last_name}
            {user.is_manager && <span className="role-tag">מנהל</span>}
          </span>
          <button type="button" className="btn btn-ghost btn-small" onClick={onLogout}>
            יציאה
          </button>
        </div>
      </div>
    </header>
  )
}
