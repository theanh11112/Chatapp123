import { Suspense, lazy } from "react";
import { Navigate, useRoutes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import RoleLayout from "../layouts/roles/RoleLayout";
import LoadingScreen from "../components/LoadingScreen";

const Loadable = (Component) => (props) => (
  <Suspense fallback={<LoadingScreen />}>
    <Component {...props} />
  </Suspense>
);

// ==========================
// Pages
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

const AdminDashboard = Loadable(lazy(() => import("../pages/roles/AdminDashboard")));
const ModeratorDashboard = Loadable(lazy(() => import("../pages/roles/ModeratorDashboard")));
const BotInfo = Loadable(lazy(() => import("../pages/roles/BotInfo")));
const GuestInfo = Loadable(lazy(() => import("../pages/roles/GuestInfo")));
const UserDashboard = Loadable(lazy(() => import("../pages/roles/UserDashboard")));

// ==========================
// Router
// ==========================
export default function Router() {
  return useRoutes([
    // Root redirect
    { path: "/", element: <Navigate to="/user/dashboard" replace /> },

    // 🧱 USER routes
    {
      path: "/user",
      element: (
        <ProtectedRoute allowedRoles={["user"]}>
          <RoleLayout role="user" showChat />
        </ProtectedRoute>
      ),
      children: [
        // ✅ Chỉ redirect khi truy cập đúng /user
        { path: "", element: <Navigate to="dashboard" replace /> },

         { path: "app", element: <GeneralApp /> },
        { path: "dashboard", element: <UserDashboard /> },
        { path: "group", element: <Group /> },
        { path: "settings", element: <Settings /> },
        { path: "conversation", element: <Conversation /> },
        { path: "chats", element: <Chats /> },
        { path: "contact", element: <Contact /> },
        { path: "profile", element: <Profile /> },
        { path: "call", element: <CallPage /> },
      ],
    },

    // 🧱 ADMIN routes
    {
      path: "/admin",
      element: (
        <ProtectedRoute allowedRoles={["admin"]}>
          <RoleLayout role="admin" showChat />
        </ProtectedRoute>
      ),
      children: [
        { path: "", element: <Navigate to="dashboard" replace /> },
        { path: "dashboard", element: <AdminDashboard /> },
        { path: "app", element: <GeneralApp /> },
        { path: "group", element: <Group /> },
        { path: "settings", element: <Settings /> },
        { path: "conversation", element: <Conversation /> },
        { path: "chats", element: <Chats /> },
        { path: "contact", element: <Contact /> },
        { path: "profile", element: <Profile /> },
        { path: "call", element: <CallPage /> },
      ],
    },

    // 🧱 MODERATOR routes
    {
      path: "/moderator",
      element: (
        <ProtectedRoute allowedRoles={["moderator"]}>
          <RoleLayout role="moderator" showChat />
        </ProtectedRoute>
      ),
      children: [
        { path: "", element: <Navigate to="dashboard" replace /> },
        { path: "dashboard", element: <ModeratorDashboard /> },
        { path: "group", element: <Group /> },
        { path: "conversation", element: <Conversation /> },
        { path: "chats", element: <Chats /> },
        { path: "contact", element: <Contact /> },
        { path: "profile", element: <Profile /> },
      ],
    },

    // 🧱 BOT routes
    {
      path: "/bot",
      element: (
        <ProtectedRoute allowedRoles={["bot"]}>
          <RoleLayout role="bot" />
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
          <RoleLayout role="guest" />
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
  ]);
}
