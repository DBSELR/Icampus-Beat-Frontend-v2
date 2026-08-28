import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import styles from './Login.module.css';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Interactive UI States
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await loginUser(username, password);
      console.log('Login API response:', response);
      
      if (response.success || response.Success) {
        // Handle both camelCase and PascalCase response properties
        const responseData = response.data || response.Data;
        const token = responseData?.token || responseData?.Token;
        const user = responseData?.user || responseData?.User;
        
        console.log('Login successful, token:', token);
        console.log('Login successful, user:', user);
        
        if (token && user) {
          // Use the login function from AuthContext with separate token and user data
          login(token, user);
          
          // Navigate to dashboard
          navigate('/dashboard');
        } else {
          setError('Invalid response format from server');
        }
      } else {
        setError(response.message || response.Message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.bgBlob1}></div>
      <div className={styles.bgBlob2}></div>
      <div className={styles.bgBlob3}></div>

      <div className={styles.loginCard}>
        <div className={styles.brandWrapper}>
          <div className={styles.logoIconContainer}>
            <i className="fa-solid fa-graduation-cap"></i>
          </div>
          <h1 className={styles.loginTitle}>iCampus Beat</h1>
          <p className={styles.loginSubtitle}>Sign in to your administration panel</p>
        </div>

        {error && (
          <div className={styles.customAlert}>
            <i className="fa-solid fa-circle-exclamation"></i>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="mb-3">
            <label htmlFor="username" className={styles.formLabel}>Username</label>
            <div className={`${styles.inputContainer} ${usernameFocused ? styles.inputContainerFocus : ''}`}>
              <span className={styles.inputIcon}>
                <i className="fa-solid fa-user"></i>
              </span>
              <input
                type="text"
                className={styles.inputField}
                id="username"
                name="username"
                placeholder="Enter your username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onFocus={() => setUsernameFocused(true)}
                onBlur={() => setUsernameFocused(false)}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="password" className={styles.formLabel}>Password</label>
            <div className={`${styles.inputContainer} ${passwordFocused ? styles.inputContainerFocus : ''}`}>
              <span className={styles.inputIcon}>
                <i className="fa-solid fa-lock"></i>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                className={styles.inputField}
                id="password"
                name="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                required
              />
              <button
                type="button"
                className={styles.passwordToggleBtn}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <i className={showPassword ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}></i>
              </button>
            </div>
          </div>

          <div className={styles.forgotPasswordWrapper}>
            <a href="#" className={styles.forgotPasswordLink}>
              Forgot Password?
            </a>
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className={styles.spinner}></div>
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <i className="fa-solid fa-arrow-right-to-bracket"></i>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login; 