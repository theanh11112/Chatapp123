// routes.js - ĐÃ CẬP NHẬT VỚI GENERALBASE
import { Suspense, lazy, useMemo } from "react";
import { Navigate, useRoutes } from "react-router-dom";
import { useKeycloak } from "@react-keycloak/web";
import ProtectedRoute from "./ProtectedRoute";
import DashboardLayout from "../layouts/dashboard";
import LoadingScreen from "../components/LoadingScreen";

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

      // 🧱 USER routes
      {
        path: "/user",
        element: (
          <ProtectedRoute allowedRoles={["user"]}>
            <DashboardLayout role="user" />
          </ProtectedRoute>
        ),
        children: [
          { path: "", element: <Navigate to="dashboard" replace /> },
          { path: "dashboard", element: <UserDashboard /> },

          // 🆕 CẬP NHẬT: Sử dụng GeneralGroup thay vì Group
          { path: "group", element: <GeneralGroup /> },

          { path: "settings", element: <Settings /> },
          { path: "contact", element: <Contact /> },
          { path: "profile", element: <Profile /> },
          { path: "call", element: <CallPage /> },

          // 🆕 CẬP NHẬT: Sử dụng GeneralChat cho individual chat
          { path: "app", element: <GeneralChat /> },

          { path: "conversation", element: <Conversation /> },
          { path: "chats", element: <Chats /> },
        ],
      },

      // 🧱 ADMIN routes
      {
        path: "/admin",
        element: (
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardLayout role="admin" />
          </ProtectedRoute>
        ),
        children: [
          { path: "", element: <Navigate to="dashboard" replace /> },
          { path: "dashboard", element: <AdminDashboard /> },

          // 🆕 CẬP NHẬT: Sử dụng GeneralGroup thay vì Group
          { path: "group", element: <GeneralGroup /> },

          { path: "settings", element: <Settings /> },
          { path: "contact", element: <Contact /> },
          { path: "profile", element: <Profile /> },
          { path: "call", element: <CallPage /> },

          // 🆕 CẬP NHẬT: Sử dụng GeneralChat cho individual chat
          { path: "app", element: <GeneralChat /> },

          { path: "conversation", element: <Conversation /> },
          { path: "chats", element: <Chats /> },
        ],
      },

      // 🧱 MODERATOR routes
      {
        path: "/moderator",
        element: (
          <ProtectedRoute allowedRoles={["moderator"]}>
            <DashboardLayout role="moderator" />
          </ProtectedRoute>
        ),
        children: [
          { path: "", element: <Navigate to="dashboard" replace /> },
          { path: "dashboard", element: <ModeratorDashboard /> },

          // 🆕 CẬP NHẬT: Sử dụng GeneralGroup thay vì Group
          { path: "group", element: <GeneralGroup /> },

          { path: "settings", element: <Settings /> },
          { path: "contact", element: <Contact /> },
          { path: "profile", element: <Profile /> },
          { path: "call", element: <CallPage /> },

          // 🆕 CẬP NHẬT: Sử dụng GeneralChat cho individual chat
          { path: "app", element: <GeneralChat /> },

          { path: "conversation", element: <Conversation /> },
          { path: "chats", element: <Chats /> },
        ],
      },

      // 🧱 BOT routes
      {
        path: "/bot",
        element: (
          <ProtectedRoute allowedRoles={["bot"]}>
            <DashboardLayout role="bot" />
          </ProtectedRoute>
        ),
        children: [
          { path: "", element: <Navigate to="info" replace /> },
          { path: "info", element: <BotInfo /> },
          { path: "profile", element: <Profile /> },
        ],
      },

      // 🧱 GUEST routes
      {
        path: "/guest",
        element: (
          <ProtectedRoute allowedRoles={["guest"]}>
            <DashboardLayout role="guest" />
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
