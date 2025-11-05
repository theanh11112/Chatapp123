// src/contexts/AuthContext.js
import { createContext, useState, useEffect } from "react";
import keycloak from "../auth/keycloak";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);

  // 🧩 Khởi tạo user info từ token
  useEffect(() => {
    if (keycloak && keycloak.authenticated) {
      const decodedToken = JSON.parse(atob(keycloak.token.split(".")[1]));
      setUser({
        username: decodedToken.preferred_username,
        email: decodedToken.email,
        roles: decodedToken.realm_access?.roles || [],
      });
      setAuthenticated(true);
    }
  }, []);

  // 🔁 Tự động refresh token mỗi 60 giây
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (keycloak) {
        keycloak
          .updateToken(60) // refresh nếu còn < 60s
          .then((refreshed) => {
            if (refreshed) {
              console.log("🔄 Token refreshed");
            }
          })
          .catch(() => {
            console.warn("Token expired → redirect login");
            keycloak.login();
          });
      }
    }, 60000); // 1 phút/lần

    return () => clearInterval(refreshInterval);
  }, []);

  // ⚙️ Hàm tiện ích
  const login = () => keycloak.login();
  const logout = () => keycloak.logout({ redirectUri: window.location.origin });
  const hasRole = (role) => user?.roles?.includes(role);

  return (
    <AuthContext.Provider
      value={{ user, authenticated, login, logout, hasRole }}
    >
      {children}
    </AuthContext.Provider>
  );
};
