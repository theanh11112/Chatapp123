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
            <AuthProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </AuthProvider>
          </SettingsProvider>
        </ReduxProvider>
      </HelmetProvider>
    </ReactKeycloakProvider>
  </React.StrictMode>
);

reportWebVitals();
