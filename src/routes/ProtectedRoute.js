import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useKeycloak } from "@react-keycloak/web";
import LoadingScreen from "../components/LoadingScreen";

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { keycloak, initialized } = useKeycloak();
  const location = useLocation();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // ✅ Luôn gọi useEffect, nhưng chỉ chạy login khi cần
  useEffect(() => {
    if (initialized && !keycloak.authenticated && !isLoggingIn) {
      setIsLoggingIn(true);
      keycloak.login({
        redirectUri: window.location.origin + location.pathname,
      });
    }
  }, [initialized, keycloak, location.pathname, isLoggingIn]);

  // 🌀 Keycloak chưa khởi tạo hoặc đang login → hiển thị loading
  if (!initialized || !keycloak.authenticated) {
    return <LoadingScreen />;
  }

  // 🧩 Kiểm tra quyền (roles)
  if (allowedRoles.length > 0) {
    const tokenParsed = keycloak.tokenParsed || {};
    const realmRoles = tokenParsed.realm_access?.roles || [];
    const clientRoles = Object.values(tokenParsed.resource_access || {})
      .flatMap((client) => client.roles || []);
    const allRoles = [...new Set([...realmRoles, ...clientRoles])];

    const hasRole = allowedRoles.some((role) => allRoles.includes(role));

    if (!hasRole) {
      return <Navigate to="/404" replace />;
    }
  }

  // ✅ Hợp lệ → render nội dung
  return <>{children}</>;
};

export default ProtectedRoute;
