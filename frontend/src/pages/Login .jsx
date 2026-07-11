import { useState } from 'react';
import api from '../services/api';

function Login({ onLogin }) {
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await api.post('/auth/login', {
                username: formData.username,
                password: formData.password
            });
            
            localStorage.setItem('token', response.data.token);
            onLogin(response.data.user);
        } catch (err) {
            setError(err.response?.data || 'Invalid username or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-wrapper">
                <div className="login-brand">
                    <div className="brand-icon">HD</div>
                    <h1>HelpDesk Pro</h1>
                    <p>Enterprise Ticket Management System</p>
                </div>
                
                <div className="login-card">
                    <h2>Welcome Back</h2>
                    <p className="login-subtitle">Sign in to your account to continue</p>
                    
                    {error && <div className="login-error">{error}</div>}
                    
                    <form onSubmit={handleLogin} className="login-form">
                        <div className="form-field">
                            <label>Username</label>
                            <input
                                type="text"
                                name="username"
                                placeholder="Enter your username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        
                        <div className="form-field">
                            <label>Password</label>
                            <input
                                type="password"
                                name="password"
                                placeholder="Enter your password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        
                        <button type="submit" className="login-btn" disabled={loading}>
                            {loading ? 'Please wait...' : 'Sign In'}
                        </button>
                    </form>
                    
                    <div className="login-footer">
                        <p>Contact your administrator for account access</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;