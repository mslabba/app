import { createContext, useState, useEffect, useContext } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  console.log('AuthProvider initializing...');
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    console.log('AuthProvider useEffect running, auth:', auth);
    if (!auth) {
      console.log('Firebase auth not available, setting loading to false');
      setLoading(false);
      return;
    }

    // Safety timeout to ensure loading is set to false
    const timeout = setTimeout(() => {
      console.log('Safety timeout: setting loading to false');
      setLoading(false);
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed, user:', user);
      setCurrentUser(user);
      
      if (user) {
        try {
          // Get ID token
          const idToken = await user.getIdToken();
          setToken(idToken);
          
          // Fetch user profile from backend
          console.log('Fetching user profile from backend...');
          const response = await axios.get(`${API}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${idToken}`
            }
          });
          
          console.log('User profile loaded:', response.data);
          setUserProfile(response.data);
        } catch (error) {
          console.error('Error fetching user profile:', error);
          // Set loading to false even if profile fetch fails
        }
      } else {
        console.log('No user, clearing profile');
        setToken(null);
        setUserProfile(null);
      }
      
      console.log('Setting loading to false');
      setLoading(false);
      clearTimeout(timeout);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const value = {
    currentUser,
    userProfile,
    token,
    loading,
    isAuthenticated: !!currentUser,
    isSuperAdmin: userProfile?.role === 'super_admin',
    isTeamAdmin: userProfile?.role === 'team_admin',
  };

  console.log('AuthProvider rendering, loading:', loading);

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="flex items-center justify-center min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white">Loading...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
