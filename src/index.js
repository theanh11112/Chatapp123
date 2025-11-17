// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { Provider as ReduxProvider } from "react-redux";
import { store } from "./redux/store";
import SettingsProvider from "./contexts/SettingsContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ReactKeycloakProvider } from "@react-keycloak/web";
import keycloak from "./auth/keycloak";
import "./locales/i18n";

const root = ReactDOM.createRoot(document.getElementById("root"));

// Loại bỏ React.StrictMode trong development để tránh double render
const isDevelopment = process.env.NODE_ENV === "development";

const appContent = (
  <ReactKeycloakProvider
    authClient={keycloak}
    initOptions={{
      onLoad: "login-required",
      checkLoginIframe: false,
      pkceMethod: "S256",
    }}
    LoadingComponent={<div>Loading Keycloak...</div>}
  >
    <HelmetProvider>
      <ReduxProvider store={store}>
        <SettingsProvider>
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </SettingsProvider>
      </ReduxProvider>
    </HelmetProvider>
  </ReactKeycloakProvider>
);

root.render(
  isDevelopment ? appContent : <React.StrictMode>{appContent}</React.StrictMode>
);

reportWebVitals();
