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
import { ReactKeycloakProvider } from "@react-keycloak/web"; // ✅ thêm dòng này
import keycloak from "./auth/keycloak"; // ✅ import instance
import './locales/i18n';

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <ReactKeycloakProvider
      authClient={keycloak}
      initOptions={{
        onLoad: "login-required",
        checkLoginIframe: false,
        pkceMethod: "S256",
      }}
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
  </React.StrictMode>
);

reportWebVitals();
