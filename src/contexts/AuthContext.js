// AuthContext.js - ĐÃ SỬA (FOCUS VÀO USER INFO, KHÔNG NAVIGATION)
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { useKeycloak } from "@react-keycloak/web";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/axiosInstance";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const { keycloak, initialized } = useKeycloak();
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);

  // 🆕 SỬA: Chỉ xử lý user info, không xử lý navigation
  useEffect(() => {
    if (initialized && keycloak?.authenticated && keycloak.tokenParsed) {
      const token = keycloak.tokenParsed;
      const roles = [
        ...(token.realm_access?.roles || []),
        ...Object.values(token.resource_access || {}).flatMap(
          (r) => r.roles || []
        ),
      ];

      const userInfo = {
        id: token.sub,
        username: token.preferred_username || token.name,
        email: token.email,
        firstName: token.given_name,
        lastName: token.family_name,
        roles,
        fullName: token.name,
      };

      console.log("👤 AuthContext - User authenticated:", userInfo);
      setUser(userInfo);
    } else if (initialized && !keycloak?.authenticated) {
      console.log("🚪 AuthContext - User logged out");
      setUser(null);
    }
  }, [initialized, keycloak?.authenticated, keycloak?.tokenParsed]);

  // 🆕 ĐƠN GIẢN HÓA: Token refresh
  useEffect(() => {
    if (keycloak?.authenticated) {
      keycloak.onTokenExpired = () => {
        console.log("🔄 AuthContext - Token expired, refreshing...");
        keycloak.updateToken(30).catch((error) => {
          console.error("❌ AuthContext - Token refresh failed:", error);
        });
      };
    }
  }, [keycloak]);

  const login = () => {
    console.log("🔐 AuthContext - Manual login triggered");
    keycloak.login();
  };

  const logout = () => {
    console.log("🚪 AuthContext - Manual logout triggered");
    keycloak.logout();
  };

  const hasRole = (role) => user?.roles?.includes(role);
  const hasAnyRole = (roles) =>
    roles.some((role) => user?.roles?.includes(role));
  const hasAllRoles = (roles) =>
    roles.every((role) => user?.roles?.includes(role));

  const value = {
    user,
    authenticated: keycloak?.authenticated,
    initialized,
    login,
    logout,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    api,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
