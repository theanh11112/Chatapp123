import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useKeycloak } from "@react-keycloak/web";
import LoadingScreen from "../components/LoadingScreen";

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { keycloak, initialized } = useKeycloak();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const location = useLocation();

  console.log("🔁 ProtectedRoute mounted:", location.pathname);

  useEffect(() => {
    console.log("🔐 ProtectedRoute render:", {
      initialized,
      authenticated: keycloak?.authenticated,
      currentPath: location.pathname,
    });

    if (!initialized) return;

    if (!keycloak.authenticated && !isLoggingIn) {
      console.warn("🚪 Not authenticated → Redirecting to Keycloak login");
      setIsLoggingIn(true);
      localStorage.setItem("postLoginRedirect", window.location.pathname);
      keycloak.login({ redirectUri: window.location.href });
    }
  }, [initialized, keycloak, isLoggingIn, location.pathname]);

  if (!initialized || !keycloak.authenticated) {
    console.log("⏳ ProtectedRoute waiting (LoadingScreen)...");
    return <LoadingScreen />;
  }

  // ✅ Role check
  if (allowedRoles.length > 0) {
    const tokenParsed = keycloak.tokenParsed || {};
    const realmRoles = tokenParsed.realm_access?.roles || [];
    const clientRoles = Object.values(tokenParsed.resource_access || {})
      .flatMap((client) => client.roles || []);

    const allRoles = [...new Set([...realmRoles, ...clientRoles])];
    const filteredRoles = allRoles.filter(
      (r) =>
        !["offline_access", "uma_authorization", "default-roles-chat-app"].includes(r)
    );

    const hasRole = allowedRoles.some((role) => filteredRoles.includes(role));

    console.log("🧩 Role check:", {
      allowedRoles,
      allRoles,
      filteredRoles,
      hasRole,
      path: location.pathname,
    });

    if (!hasRole) {
      console.warn("⛔ No access → redirect to /404");
      return <Navigate to="/404" replace />;
    }
  }

  console.log("✅ Access granted → render children for", location.pathname);
  return <>{children}</>;
};

export default ProtectedRoute;
