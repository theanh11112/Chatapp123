// src/routes/index.js
import { Suspense, lazy } from "react";
import { Navigate, useRoutes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

// layouts
import DashboardLayout from "../layouts/dashboard";

// config
import { DEFAULT_PATH } from "../config";
import LoadingScreen from "../components/LoadingScreen";

const Loadable = (Component) => (props) => (
  <Suspense fallback={<LoadingScreen />}>
    <Component {...props} />
  </Suspense>
);

export default function Router() {
  return useRoutes([
    // 🧭 Main Dashboard routes (protected)
    {
      path: "/",
      element: (
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      ),
      children: [
        { element: <Navigate to={DEFAULT_PATH} replace />, index: true },
        { path: "app", element: <GeneralApp /> },
        { path: "group", element: <Group /> },
        { path: "settings", element: <Settings /> },
        { path: "conversation", element: <Conversation /> },
        { path: "chats", element: <Chats /> },
        { path: "contact", element: <Contact /> },
        { path: "profile", element: <Profile /> },
        { path: "call", element: <CallPage /> },

        // 🧱 Role-based routes
        {
          path: "admin/dashboard",
          element: (
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          ),
        },
        {
          path: "moderator/dashboard",
          element: (
            <ProtectedRoute allowedRoles={["moderator"]}>
              <ModeratorDashboard />
            </ProtectedRoute>
          ),
        },
        {
          path: "bot/info",
          element: (
            <ProtectedRoute allowedRoles={["bot"]}>
              <BotInfo />
            </ProtectedRoute>
          ),
        },
        {
          path: "guest/info",
          element: (
            <ProtectedRoute allowedRoles={["guest"]}>
              <GuestInfo />
            </ProtectedRoute>
          ),
        },
        {
          path: "user/dashboard",
          element: (
            <ProtectedRoute allowedRoles={["user"]}>
              <UserDashboard />
            </ProtectedRoute>
          ),
        },

        // ⚠️ Not found
        { path: "404", element: <Page404 /> },
        { path: "*", element: <Navigate to="/404" replace /> },
      ],
    },

    // ⚠️ Catch-all
    { path: "*", element: <Navigate to="/404" replace /> },
  ]);
}

// ==========================
// Lazy loaded components
// ==========================

const GeneralApp = Loadable(lazy(() => import("../pages/dashboard/GeneralApp")));
const Conversation = Loadable(lazy(() => import("../pages/dashboard/Conversation")));
const Chats = Loadable(lazy(() => import("../pages/dashboard/Chats")));
const Group = Loadable(lazy(() => import("../pages/dashboard/Group")));
const CallPage = Loadable(lazy(() => import("../pages/dashboard/Call")));
const Contact = Loadable(lazy(() => import("../sections/dashboard/Contact")));
const Page404 = Loadable(lazy(() => import("../pages/Page404")));
const Settings = Loadable(lazy(() => import("../pages/dashboard/Settings")));
const Profile = Loadable(lazy(() => import("../pages/dashboard/Settings/Profile")));

// ==========================
// Role-based pages
// ==========================
const AdminDashboard = Loadable(lazy(() => import("../pages/roles/AdminDashboard")));
const ModeratorDashboard = Loadable(lazy(() => import("../pages/roles/ModeratorDashboard")));
const BotInfo = Loadable(lazy(() => import("../pages/roles/BotInfo")));
const GuestInfo = Loadable(lazy(() => import("../pages/roles/GuestInfo")));
const UserDashboard = Loadable(lazy(() => import("../pages/roles/UserDashboard")));
