// ProtectedRoute.js - THÊM FALLBACK
import React, { useEffect, useState, useRef, useCallback } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useKeycloak } from "@react-keycloak/web";
import LoadingScreen from "../components/LoadingScreen";

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { keycloak, initialized } = useKeycloak();
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const authCheckedRef = useRef(false);
  const loginRedirectRef = useRef(false);

  // Debug re-render
  useEffect(() => {
    console.log("🔵 ProtectedRoute MOUNT", location.pathname);
    return () => console.log("🔴 ProtectedRoute UNMOUNT", location.pathname);
  }, [location.pathname]);

  // Check login - OPTIMIZED
  useEffect(() => {
    if (!initialized) return;
    if (authCheckedRef.current) return;

    authCheckedRef.current = true;

    if (!keycloak.authenticated) {
      if (!loginRedirectRef.current) {
        console.log("🔄 Redirecting to login...");
        loginRedirectRef.current = true;
        localStorage.setItem("postLoginRedirect", location.pathname);
        keycloak.login({
          redirectUri: window.location.origin + location.pathname,
        });
      }
    } else {
      console.log("✅ User authenticated, setting ready");
      setReady(true);
    }
  }, [initialized, keycloak.authenticated]);

  // Reset refs khi authenticated thay đổi
  useEffect(() => {
    if (keycloak.authenticated) {
      authCheckedRef.current = false;
      loginRedirectRef.current = false;
    }
  }, [keycloak.authenticated]);

  // Kiểm tra role với useCallback để tránh re-render
  const hasRequiredRole = useCallback(() => {
    if (allowedRoles.length === 0) return true;

    const token = keycloak.tokenParsed;
    if (!token) return false;

    const realmRoles = token?.realm_access?.roles || [];
    const clientRoles = Object.values(token?.resource_access || {}).flatMap(
      (c) => c.roles || []
    );
    const allRoles = [...new Set([...realmRoles, ...clientRoles])];

    // 🆕 THÊM: Nếu user không có role nào, mặc định là "user"
    if (allRoles.length === 0 && allowedRoles.includes("user")) {
      return true;
    }

    return allowedRoles.some((r) => allRoles.includes(r));
  }, [keycloak.tokenParsed, allowedRoles]);

  if (!initialized) {
    return <LoadingScreen />;
  }

  if (!keycloak.authenticated || !ready) {
    return <LoadingScreen />;
  }

  // Kiểm tra role
  if (allowedRoles.length > 0 && !hasRequiredRole()) {
    console.warn("🚨 User không có role phù hợp:", {
      path: location.pathname,
      allowedRoles,
      userRoles: keycloak.tokenParsed?.realm_access?.roles || [],
    });
    return <Navigate to="/404" replace />;
  }

  return children;
};

export default React.memo(ProtectedRoute);
