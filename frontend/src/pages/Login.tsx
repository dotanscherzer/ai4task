import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      let response;
      if (isRegisterMode) {
        response = await authAPI.register(email, password);
      } else {
        response = await authAPI.login(email, password);
      }
      login(response.token, response.user);
      navigate('/admin');
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          (isRegisterMode ? 'שגיאה בהרשמה' : 'שגיאה בהתחברות')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>{isRegisterMode ? 'הרשמה' : 'התחברות'}</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>אימייל</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label>סיסמה</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" disabled={isLoading}>
            {isLoading
              ? isRegisterMode
                ? 'נרשם...'
                : 'מתחבר...'
              : isRegisterMode
              ? 'הרשם'
              : 'התחבר'}
          </button>
          <div className="toggle-mode">
            <button
              type="button"
              className="toggle-button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setError('');
              }}
              disabled={isLoading}
            >
              {isRegisterMode
                ? 'יש לך כבר חשבון? התחבר'
                : 'אין לך חשבון? הרשם'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;

