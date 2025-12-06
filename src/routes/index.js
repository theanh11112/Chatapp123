import { Suspense, lazy, useMemo } from "react";
import { Navigate, useRoutes } from "react-router-dom";
import { useKeycloak } from "@react-keycloak/web";
import ProtectedRoute from "./ProtectedRoute";
import DashboardLayout from "../layouts/dashboard";
import LoadingScreen from "../components/LoadingScreen";
import React from "react";

// 🆕 IMPORT E2EE HOOKS AND COMPONENTS
import { useAutoE2EE } from "../e2ee/hooks/useAutoE2EE";
import { E2EEStatusIndicator } from "../e2ee";

const Loadable = (Component) => (props) =>
  (
    <Suspense fallback={<LoadingScreen />}>
      <Component {...props} />
    </Suspense>
  );

// ==========================
// Pages
// ==========================
const GeneralChat = Loadable(
  lazy(() => import("../pages/dashboard/GeneralChat"))
);
const GeneralGroup = Loadable(
  lazy(() => import("../pages/dashboard/GeneralGroup"))
);
const Conversation = Loadable(
  lazy(() => import("../pages/dashboard/Conversation"))
);
const Chats = Loadable(lazy(() => import("../pages/dashboard/Chats")));
const Group = Loadable(lazy(() => import("../pages/dashboard/Group")));
const CallPage = Loadable(lazy(() => import("../pages/dashboard/Call")));
const Contact = Loadable(lazy(() => import("../sections/dashboard/Contact")));
const Page404 = Loadable(lazy(() => import("../pages/Page404")));
const Settings = Loadable(lazy(() => import("../pages/dashboard/Settings")));
const Profile = Loadable(
  lazy(() => import("../pages/dashboard/Settings/Profile"))
);

const AdminDashboard = Loadable(
  lazy(() => import("../pages/roles/AdminDashboard"))
);
const ModeratorDashboard = Loadable(
  lazy(() => import("../pages/roles/ModeratorDashboard"))
);
const BotInfo = Loadable(lazy(() => import("../pages/roles/BotInfo")));
const GuestInfo = Loadable(lazy(() => import("../pages/roles/GuestInfo")));
const UserDashboard = Loadable(
  lazy(() => import("../pages/roles/UserDashboard"))
);

// 🆕 TẠO: E2EE Route Wrapper Component
const E2EERouteWrapper = ({ children }) => {
  const { isReady, status, isInitializing, isError, myFingerprint } =
    useAutoE2EE();

  // Log E2EE status for debugging
  React.useEffect(() => {
    console.log("🔐 E2EERouteWrapper - Status:", {
      status,
      isReady,
      isInitializing,
      isError,
      hasFingerprint: !!myFingerprint,
    });

    if (isError) {
      console.warn("⚠️ E2EE initialization error in route wrapper:", {
        status,
        isError,
      });
    }
  }, [status, isReady, isInitializing, isError, myFingerprint]);

  // Show loading while initializing
  if (isInitializing) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <E2EEStatusIndicator showLabel={true} />
          <span>Initializing encryption system...</span>
        </div>
        <LoadingScreen />
      </div>
    );
  }

  // Show error state
  if (isError) {
    return (
      <div
        style={{
          padding: "20px",
          textAlign: "center",
          maxWidth: "600px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            backgroundColor: "#ffebee",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #f44336",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ color: "#d32f2f", marginBottom: "10px" }}>
            ⚠️ Encryption System Error
          </h3>
          <p style={{ color: "#666", marginBottom: "15px" }}>
            The encryption system encountered an error. You can still use the
            chat, but messages may not be end-to-end encrypted.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: "#1976d2",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Retry Initialization
          </button>
        </div>
        {children}
      </div>
    );
  }

  return (
    <>
      {/* E2EE Status Indicator in corner */}
      <div
        style={{
          position: "fixed",
          top: "80px",
          right: "20px",
          zIndex: 1199,
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "8px 12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          border: "1px solid #e0e0e0",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <E2EEStatusIndicator showLabel={false} />
        <span
          style={{
            fontSize: "12px",
            color: isReady ? "#4caf50" : "#ff9800",
            fontWeight: "500",
          }}
        >
          {isReady ? "Encrypted" : "Setting up..."}
        </span>
      </div>

      {children}
    </>
  );
};

// 🆕 TẠO: Root Redirect Component
const RootRedirect = () => {
  const { keycloak, initialized } = useKeycloak();

  if (!initialized) {
    return <LoadingScreen />;
  }

  if (keycloak.authenticated) {
    const roles = keycloak.tokenParsed?.realm_access?.roles || [];

    console.log("🔄 RootRedirect - User roles:", roles);

    if (roles.includes("admin")) {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (roles.includes("moderator")) {
      return <Navigate to="/moderator/dashboard" replace />;
    } else if (roles.includes("bot")) {
      return <Navigate to="/bot/info" replace />;
    } else if (roles.includes("guest")) {
      return <Navigate to="/guest/info" replace />;
    } else {
      return <Navigate to="/user/dashboard" replace />;
    }
  } else {
    console.log(
      "🔐 RootRedirect - Not authenticated, redirecting to Keycloak login..."
    );
    keycloak.login();
    return <LoadingScreen />;
  }
};

// ==========================
// Router Component
// ==========================
export default function Router() {
  const { keycloak, initialized } = useKeycloak();

  const routes = useMemo(
    () => [
      {
        path: "/",
        element: <RootRedirect />,
      },

      // 🧱 USER routes với E2EE Wrapper
      {
        path: "/user",
        element: (
          <ProtectedRoute allowedRoles={["user"]}>
            <E2EERouteWrapper>
              <DashboardLayout role="user" />
            </E2EERouteWrapper>
          </ProtectedRoute>
        ),
        children: [
          { path: "", element: <Navigate to="dashboard" replace /> },
          { path: "dashboard", element: <UserDashboard /> },
          { path: "group", element: <GeneralGroup /> },
          { path: "settings", element: <Settings /> },
          { path: "contact", element: <Contact /> },
          { path: "profile", element: <Profile /> },
          { path: "call", element: <CallPage /> },
          { path: "app", element: <GeneralChat /> },
          { path: "conversation", element: <Conversation /> },
          { path: "chats", element: <Chats /> },
        ],
      },

      // 🧱 ADMIN routes với E2EE Wrapper
      {
        path: "/admin",
        element: (
          <ProtectedRoute allowedRoles={["admin"]}>
            <E2EERouteWrapper>
              <DashboardLayout role="admin" />
            </E2EERouteWrapper>
          </ProtectedRoute>
        ),
        children: [
          { path: "", element: <Navigate to="dashboard" replace /> },
          { path: "dashboard", element: <AdminDashboard /> },
          { path: "group", element: <GeneralGroup /> },
          { path: "settings", element: <Settings /> },
          { path: "contact", element: <Contact /> },
          { path: "profile", element: <Profile /> },
          { path: "call", element: <CallPage /> },
          { path: "app", element: <GeneralChat /> },
          { path: "conversation", element: <Conversation /> },
          { path: "chats", element: <Chats /> },
        ],
      },

      // 🧱 MODERATOR routes với E2EE Wrapper
      {
        path: "/moderator",
        element: (
          <ProtectedRoute allowedRoles={["moderator"]}>
            <E2EERouteWrapper>
              <DashboardLayout role="moderator" />
            </E2EERouteWrapper>
          </ProtectedRoute>
        ),
        children: [
          { path: "", element: <Navigate to="dashboard" replace /> },
          { path: "dashboard", element: <ModeratorDashboard /> },
          { path: "group", element: <GeneralGroup /> },
          { path: "settings", element: <Settings /> },
          { path: "contact", element: <Contact /> },
          { path: "profile", element: <Profile /> },
          { path: "call", element: <CallPage /> },
          { path: "app", element: <GeneralChat /> },
          { path: "conversation", element: <Conversation /> },
          { path: "chats", element: <Chats /> },
        ],
      },

      // 🧱 BOT routes với E2EE Wrapper
      {
        path: "/bot",
        element: (
          <ProtectedRoute allowedRoles={["bot"]}>
            <E2EERouteWrapper>
              <DashboardLayout role="bot" />
            </E2EERouteWrapper>
          </ProtectedRoute>
        ),
        children: [
          { path: "", element: <Navigate to="info" replace /> },
          { path: "info", element: <BotInfo /> },
          { path: "profile", element: <Profile /> },
        ],
      },

      // 🧱 GUEST routes với E2EE Wrapper
      {
        path: "/guest",
        element: (
          <ProtectedRoute allowedRoles={["guest"]}>
            <E2EERouteWrapper>
              <DashboardLayout role="guest" />
            </E2EERouteWrapper>
          </ProtectedRoute>
        ),
        children: [
          { path: "", element: <Navigate to="info" replace /> },
          { path: "info", element: <GuestInfo /> },
          { path: "profile", element: <Profile /> },
        ],
      },

      // ⚠️ 404 fallback
      { path: "/404", element: <Page404 /> },
      { path: "*", element: <Navigate to="/404" replace /> },
    ],
    []
  );

  const routing = useRoutes(routes);

  if (!initialized) {
    return <LoadingScreen />;
  }

  return routing;
}
