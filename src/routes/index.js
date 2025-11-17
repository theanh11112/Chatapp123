// Router.js - BỎ RoleLayout, dùng DashboardLayout cho tất cả routes
import { Suspense, lazy, useMemo } from "react";
import { Navigate, useRoutes } from "react-router-dom";
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
const GeneralApp = Loadable(
  lazy(() => import("../pages/dashboard/GeneralApp"))
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

// ==========================
// Router Component
// ==========================
export default function Router() {
  const routes = useMemo(
    () => [
      // Root redirect
      { path: "/", element: <Navigate to="/user/dashboard" replace /> },

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
          { path: "group", element: <Group /> },
          { path: "settings", element: <Settings /> },
          { path: "contact", element: <Contact /> },
          { path: "profile", element: <Profile /> },
          { path: "call", element: <CallPage /> },
          { path: "app", element: <GeneralApp /> },
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
          { path: "group", element: <Group /> },
          { path: "settings", element: <Settings /> },
          { path: "contact", element: <Contact /> },
          { path: "profile", element: <Profile /> },
          { path: "call", element: <CallPage /> },
          { path: "app", element: <GeneralApp /> },
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
          { path: "group", element: <Group /> },
          { path: "contact", element: <Contact /> },
          { path: "profile", element: <Profile /> },
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

  return useRoutes(routes);
}
