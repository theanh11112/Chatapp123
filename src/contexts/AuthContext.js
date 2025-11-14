import { createContext, useContext, useEffect, useState } from "react";
import { useKeycloak } from "@react-keycloak/web";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosInstance";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const { keycloak } = useKeycloak();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Khi Keycloak xác thực thành công
  useEffect(() => {
    if (keycloak?.authenticated) {
      const token = keycloak.tokenParsed;
      const roles = [
        ...(token.realm_access?.roles || []),
        ...(Object.values(token.resource_access || {}).flatMap(
          (r) => r.roles
        ) || []),
      ];

      setUser({
        username: token.preferred_username,
        email: token.email,
        roles,
      });

      // 🚀 Điều hướng theo role
      if (roles.includes("admin")) navigate("/admin/dashboard");
      else if (roles.includes("moderator")) navigate("/moderator/dashboard");
      else if (roles.includes("bot")) navigate("/bot/info");
      else if (roles.includes("guest")) navigate("/guest/info");
      else navigate("/user/dashboard");
    }
  }, [keycloak?.authenticated, keycloak?.tokenParsed, navigate]);

  // 🔁 Refresh token định kỳ
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (keycloak?.authenticated) {
        keycloak
          .updateToken(60)
          .then((refreshed) => {
            if (refreshed) console.log("🔄 Token refreshed");
          })
          .catch(() => {
            console.warn("❌ Token expired → login lại");
            keycloak.login({ redirectUri: window.location.origin });
          });
      }
    }, 60000);
    return () => clearInterval(refreshInterval);
  }, [keycloak]);

  const login = () => keycloak.login({ redirectUri: window.location.origin });
  const logout = () => keycloak.logout({ redirectUri: window.location.origin });
  const hasRole = (role) => user?.roles?.includes(role);

  return (
    <AuthContext.Provider
      value={{
        user,
        authenticated: keycloak?.authenticated,
        login,
        logout,
        hasRole,
        api,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
