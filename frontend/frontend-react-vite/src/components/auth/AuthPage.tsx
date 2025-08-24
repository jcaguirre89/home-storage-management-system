import React, { useState } from 'react';
import Login from './Login';
import Register from './Register';

const AuthPage: React.FC = () => {
  const [isLoginView, setIsLoginView] = useState(true);

  if (isLoginView) {
    return <Login onToggle={() => setIsLoginView(false)} />;
  }

  return <Register onToggle={() => setIsLoginView(true)} />;
};

export default AuthPage;
