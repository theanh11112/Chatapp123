import Keycloak from "keycloak-js";

const keycloak = new Keycloak({
  url: "http://localhost:8080/",
  realm: "chat-app",
  clientId: "my-react-app",
});

// 🔁 Hàm khởi tạo Keycloak (được gọi trong index.js)
export const initKeycloak = (onAuthenticatedCallback) => {
  keycloak
    .init({
      onLoad: "login-required", // yêu cầu login nếu chưa có session
      checkLoginIframe: false,  // tắt kiểm tra iframe (giảm lỗi CORS)
      pkceMethod: "S256",       // bảo mật cho public client
    })
    .then((authenticated) => {
      if (!authenticated) {
        keycloak.login();
      } else {
        onAuthenticatedCallback();
      }
    })
    .catch((error) => {
      console.error("Keycloak init failed:", error);
    });
};

export default keycloak;
