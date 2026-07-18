import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center animate-fade-in" style={{ minHeight: '60vh', textAlign: 'center', padding: 'var(--space-12)', width: '100%' }}>
      <h1 className="text-gradient" style={{ fontSize: '6rem', lineHeight: 1, marginBottom: 'var(--space-2)' }}>404</h1>
      <h2 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-4)' }}>Page Not Found</h2>
      <p className="text-secondary" style={{ maxWidth: '480px', marginBottom: 'var(--space-8)' }}>
        Oops! The administration panel page you are looking for doesn't exist, has been removed, or is temporarily unavailable.
      </p>
      <Link to="/" className="btn btn-primary">
        🏠 Go to Dashboard
      </Link>
    </div>
  );
}

export default NotFound;
