// src/auth/keycloak.js
import Keycloak from "keycloak-js";

// ⚙️ Tạo instance Keycloak 1 lần duy nhất
const keycloak = new Keycloak({
  url: "http://localhost:8080/",
  realm: "chat-app",
  clientId: "my-react-app",
});

export default keycloak;
