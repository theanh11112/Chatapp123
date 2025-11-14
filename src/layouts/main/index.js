import React from "react";
import { Outlet } from "react-router-dom";
import { useKeycloak } from "@react-keycloak/web";
import LoadingScreen from "../components/LoadingScreen";

const MainLayout = () => {
  const { keycloak, initialized } = useKeycloak();

  if (!initialized) return <LoadingScreen />;

  if (!keycloak.authenticated) {
    keycloak.login(); // tự redirect đến Keycloak
    return <LoadingScreen />;
  }

  return (
    <>
      <div>Main Layout</div>
      <Outlet />
    </>
  );
};

export default MainLayout;
