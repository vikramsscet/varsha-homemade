import { useCallback, useEffect, useRef, useState } from 'react';
import { getAuthErrorMessage, getMe } from '../../services/authApi';
import { formatDate, formatDateTime, formatStatus, getInitials, orNotProvided } from '../../services/profileFormat';
import Breadcrumbs from '../../components/Breadcrumbs';
import './profile.css';

function Avatar({ user }) {
  const [failed, setFailed] = useState(false);
  if (user.profileImageUrl && !failed) {
    return (
      <img
        className="profile-avatar"
        src={user.profileImageUrl}
        alt={`${user.displayName || user.email} profile`}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  }
  return <div className="profile-avatar profile-avatar-fallback" aria-hidden="true">{getInitials(user)}</div>;
}

function Row({ label, children, secondary = false }) {
  return (
    <div className={`profile-row ${secondary ? 'is-secondary' : ''}`}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const started = useRef(false); // StrictMode runs effects twice in dev; fetch once per mount

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUser(await getMe());
    } catch (err) {
      // A 401 is handled globally (sign-out + redirect to login).
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    load();
  }, [load]);

  if (loading) {
    return (
      <main className="profile-page container" aria-busy="true">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Profile' }]} />
        <p className="profile-loading" role="status">Loading your profile…</p>
        <div className="profile-skeleton" aria-hidden="true" />
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className="profile-page container">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Profile' }]} />
        <section className="profile-card profile-error" role="alert">
          <p>{error || 'Could not load your profile.'}</p>
          <button type="button" className="profile-retry" onClick={load}>Retry</button>
        </section>
      </main>
    );
  }

  return (
    <main className="profile-page container">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Profile' }]} />
      <section className="profile-card profile-header">
        <Avatar user={user} />
        <div className="profile-identity">
          <h1>{user.displayName || user.email}</h1>
          <p>{user.email}</p>
          <div className="profile-badges">
            <span className={`profile-badge ${user.emailVerified ? 'is-good' : 'is-warn'}`}>
              {user.emailVerified ? 'Email verified' : 'Email not verified'}
            </span>
            <span className={`profile-badge ${user.status === 'ACTIVE' ? 'is-good' : 'is-warn'}`}>
              {formatStatus(user.status)}
            </span>
          </div>
        </div>
      </section>

      <section className="profile-card">
        <h2>Personal information</h2>
        <dl className="profile-list">
          <Row label="Full name">{orNotProvided(user.displayName)}</Row>
          <Row label="First name">{orNotProvided(user.firstName)}</Row>
          <Row label="Last name">{orNotProvided(user.lastName)}</Row>
          <Row label="Email address">{orNotProvided(user.email)}</Row>
          <Row label="Email verified">{user.emailVerified ? 'Verified' : 'Not Verified'}</Row>
          <Row label="Account status">{formatStatus(user.status)}</Row>
          <Row label="Last login">{formatDateTime(user.lastLoginAt)}</Row>
          <Row label="Member since">{formatDate(user.createdAt)}</Row>
          <Row label="User ID" secondary><code>{orNotProvided(user.id)}</code></Row>
        </dl>
      </section>
    </main>
  );
}
