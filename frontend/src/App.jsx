import { useState, useEffect } from "react";
import LoginPage from "./components/LoginPage";
import StudentDashboard from "./components/student/StudentDashboard";
import TeacherDashboard from "./components/teacher/TeacherDashboard";
import { getToken, clearToken } from "./api";
import ChatbotWidget from "./components/ChatbotWidget";

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const handleLogoutEvent = () => {
      setUser(null);
      clearToken();
    };
    window.addEventListener("auth:logout", handleLogoutEvent);
    
    const token = getToken();
    if (token) {
      const payload = parseJwt(token);
      if (payload && payload.exp * 1000 > Date.now()) {
        // Restore minimal user state from token
        setUser({ userid: payload.sub, role: payload.role });
      } else {
        clearToken();
      }
    }
    
    return () => window.removeEventListener("auth:logout", handleLogoutEvent);
  }, []);

  const handleLogout = () => {
    setUser(null);
    clearToken();
  };

  const handleLogin = (userData) => {
    setUser({ userid: userData.userid, role: userData.role });
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (user.role === "teacher") {
    return (
      <>
        <TeacherDashboard teacher={user} onLogout={handleLogout} />
        <ChatbotWidget role={user.role} />
      </>
    );
  }

  return (
    <>
      <StudentDashboard student={user} onLogout={handleLogout} />
      <ChatbotWidget role={user.role} />
    </>
  );
}
