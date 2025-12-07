// import React, {
//   createContext,
//   useContext,
//   useState,
//   useEffect,
//   useCallback,
// } from "react";
// import { useKeycloak } from "@react-keycloak/web";
// import { useDispatch } from "react-redux";
// import { showSnackbar } from "../redux/slices/app";
// //import e2eeService from "../e2ee/utils/e2ee";

// //import autoEncryptionService from "../e2ee/services/autoEncryptionService";

// // 🆕 Import hàm để set socket cho encryption service
// //import { setEncryptionServiceSocket } from "../e2ee/services/autoEncryptionService";

// const E2EEContext = createContext({});

// export const useE2EE = () => {
//   const context = useContext(E2EEContext);
//   if (!context) {
//     throw new Error("useE2EE must be used within E2EEProvider");
//   }
//   return context;
// };

// export const E2EEProvider = ({ children }) => {
//   const dispatch = useDispatch();
//   const { keycloak, initialized } = useKeycloak();
//   const [e2eeEnabled, setE2EEEnabled] = useState(false);
//   const [myKeys, setMyKeys] = useState([]);
//   const [friendsE2EEStatus, setFriendsE2EEStatus] = useState({});
//   const [isInitializing, setIsInitializing] = useState(false);
//   const [activeKeyExchange, setActiveKeyExchange] = useState(null);
//   const [friendKeys, setFriendKeys] = useState({});
//   const [socketReady, setSocketReady] = useState(false);
//   const [autoEncryption, setAutoEncryption] = useState(null);
//   const [isAutoEncryptionReady, setIsAutoEncryptionReady] = useState(false);

//   // 🆕 Effect để chờ socket connection
//   useEffect(() => {
//     const checkSocket = async () => {
//       await waitForSocketConnection();
//       setSocketReady(true);
//     };

//     if (initialized && keycloak.authenticated) {
//       checkSocket();
//     }
//   }, [initialized, keycloak.authenticated]);

//   // 🆕 Effect để initialize E2EE khi socket ready
//   useEffect(() => {
//     if (socketReady && initialized && keycloak.authenticated) {
//       initializeE2EE();
//     }
//   }, [socketReady, initialized, keycloak.authenticated]);

//   useEffect(() => {
//     const initializeAutoEncryption = async () => {
//       if (socketReady && !autoEncryption) {
//         try {
//           console.log(
//             "🔄 [E2EEContext] Initializing auto encryption service..."
//           );

//           // Set socket cho service
//           const socket = window.socket;
//           if (socket) {
//             setEncryptionServiceSocket(socket);
//             console.log("✅ [E2EEContext] Socket set for auto encryption");
//           }

//           // Initialize service
//           await autoEncryptionService.initialize();
//           console.log("✅ [E2EEContext] Auto encryption service initialized");

//           // Check if ready
//           if (autoEncryptionService.isReady()) {
//             setAutoEncryption(autoEncryptionService);
//             setIsAutoEncryptionReady(true);
//             console.log("🎉 [E2EEContext] Auto encryption service ready");
//           }
//         } catch (error) {
//           console.error(
//             "❌ [E2EEContext] Failed to initialize auto encryption:",
//             error
//           );
//         }
//       }
//     };

//     initializeAutoEncryption();
//   }, [socketReady, autoEncryption]);

//   const initializeE2EE = async () => {
//     try {
//       setIsInitializing(true);
//       const keycloakId = keycloak.subject;

//       console.log("🔐 Initializing E2EE for user:", keycloakId);

//       // 🆕 Set socket cho encryption service trước khi initialize
//       const socket = window.socket;
//       if (socket) {
//         setEncryptionServiceSocket(socket);
//         console.log("🔌 Socket set for encryption service");
//       }

//       // Initialize E2EE service
//       e2eeService.initialize(keycloakId);

//       // Get E2EE info from server
//       const info = await e2eeService.getE2EEInfo();

//       // Update state
//       setE2EEEnabled(info.e2eeEnabled || false);
//       setMyKeys(info.keys || []);
//       setFriendsE2EEStatus(info.friendsE2EEStatus || {});
//       setFriendKeys(info.friendKeys || {});

//       // If no local keys but server says we should have them
//       if (!e2eeService.hasKeyPair() && info.e2eeEnabled) {
//         console.log("⚠️ Server says E2EE is enabled but no local keys found");
//         setE2EEEnabled(false);
//       }

//       // Setup socket listeners
//       setupSocketListeners();

//       console.log("✅ E2EE initialized successfully");
//     } catch (error) {
//       console.error("❌ Error initializing E2EE:", error);
//       dispatch(
//         showSnackbar({
//           severity: "error",
//           message: "Failed to initialize encryption",
//         })
//       );
//     } finally {
//       setIsInitializing(false);
//     }
//   };

//   const waitForSocketConnection = () => {
//     return new Promise((resolve) => {
//       const maxAttempts = 50; // 5 seconds
//       let attempts = 0;

//       const checkSocket = () => {
//         const socket = window.socket;

//         if (socket && socket.connected) {
//           console.log("✅ Socket connected");
//           resolve(socket);
//         } else if (attempts >= maxAttempts) {
//           console.warn("⚠️ Socket connection timeout");
//           resolve(null); // Resolve với null nếu timeout
//         } else {
//           attempts++;
//           setTimeout(checkSocket, 100);
//         }
//       };

//       checkSocket();
//     });
//   };

//   const setupSocketListeners = () => {
//     const socket = window.socket;
//     if (!socket) return;

//     // Key exchange request from friend
//     socket.on("key_exchange_request", (data) => {
//       console.log("🔑 Key exchange request received:", data);
//       setActiveKeyExchange(data);

//       dispatch(
//         showSnackbar({
//           severity: "info",
//           message: `Key exchange request from ${data.senderName}`,
//         })
//       );
//     });

//     // Key exchange confirmed
//     socket.on("key_exchange_confirmed", (data) => {
//       console.log("✅ Key exchange confirmed:", data);
//       setActiveKeyExchange(null);

//       // Update friend keys
//       setFriendKeys((prev) => ({
//         ...prev,
//         [data.peerId]: {
//           publicKey: data.publicKey,
//           fingerprint: data.fingerprint,
//         },
//       }));

//       dispatch(
//         showSnackbar({
//           severity: "success",
//           message: `End-to-end encryption established`,
//         })
//       );
//     });

//     // Friend E2EE status changed
//     socket.on("friend_e2ee_status_changed", (data) => {
//       console.log("🔄 Friend E2EE status changed:", data);
//       setFriendsE2EEStatus((prev) => ({
//         ...prev,
//         [data.userId]: data.enabled,
//       }));
//     });

//     // Friend updated E2EE key
//     socket.on("friend_e2ee_key_updated", (data) => {
//       console.log("🔄 Friend updated E2EE key:", data);

//       setFriendKeys((prev) => ({
//         ...prev,
//         [data.userId]: {
//           publicKey: data.publicKey,
//           fingerprint: data.fingerprint,
//         },
//       }));
//     });

//     // Handle socket disconnect/reconnect
//     socket.on("disconnect", () => {
//       console.warn("🔌 Socket disconnected");
//       setSocketReady(false);
//     });

//     socket.on("reconnect", () => {
//       console.log("🔌 Socket reconnected");
//       setSocketReady(true);

//       // Re-set socket cho encryption service
//       setEncryptionServiceSocket(socket);

//       // Re-fetch E2EE info
//       setTimeout(() => {
//         if (keycloak.authenticated) {
//           initializeE2EE();
//         }
//       }, 1000);
//     });
//   };

//   const toggleE2EE = useCallback(
//     async (enabled) => {
//       try {
//         console.log(`🔄 Toggling E2EE to: ${enabled}`);

//         if (enabled) {
//           // Bật E2EE - tạo keys nếu chưa có
//           if (!e2eeService.hasKeyPair()) {
//             console.log("🔑 Generating new key pair...");
//             await e2eeService.generateKeyPair();

//             // Update server với public key
//             const publicKey = await e2eeService.getMyPublicKey();
//             await e2eeService.updateE2EEKey(publicKey);
//           }

//           // Enable E2EE trên server
//           await e2eeService.toggleE2EE(true);
//         } else {
//           // Tắt E2EE trên server
//           await e2eeService.toggleE2EE(false);
//         }

//         setE2EEEnabled(enabled);

//         dispatch(
//           showSnackbar({
//             severity: "success",
//             message: `Encryption ${enabled ? "enabled" : "disabled"}`,
//           })
//         );

//         return true;
//       } catch (error) {
//         console.error("❌ Error toggling E2EE:", error);
//         dispatch(
//           showSnackbar({
//             severity: "error",
//             message: `Failed to ${enabled ? "enable" : "disable"} encryption`,
//           })
//         );
//         return false;
//       }
//     },
//     [dispatch]
//   );

//   const generateKeyPair = useCallback(async () => {
//     try {
//       return await e2eeService.generateKeyPair();
//     } catch (error) {
//       console.error("❌ Error generating key pair:", error);
//       throw error;
//     }
//   }, []);

//   const updateE2EEKey = useCallback(async (publicKey) => {
//     try {
//       return await e2eeService.updateE2EEKey(publicKey);
//     } catch (error) {
//       console.error("❌ Error updating E2EE key:", error);
//       throw error;
//     }
//   }, []);

//   const getMyPublicKey = useCallback(async () => {
//     return await e2eeService.getMyPublicKey();
//   }, []);

//   const deleteAllKeys = useCallback(async () => {
//     try {
//       await e2eeService.deleteAllKeys();
//       setE2EEEnabled(false);
//       setMyKeys([]);
//       return true;
//     } catch (error) {
//       console.error("❌ Error deleting keys:", error);
//       throw error;
//     }
//   }, []);

//   const initiateKeyExchange = useCallback(async (friendKeycloakId) => {
//     try {
//       await e2eeService.initiateKeyExchange(friendKeycloakId);
//       return true;
//     } catch (error) {
//       console.error("❌ Error initiating key exchange:", error);
//       throw error;
//     }
//   }, []);

//   const confirmKeyExchange = useCallback(
//     async (exchangeId, friendKeycloakId, verified) => {
//       try {
//         await e2eeService.confirmKeyExchange(
//           exchangeId,
//           friendKeycloakId,
//           verified
//         );
//         setActiveKeyExchange(null);
//         return true;
//       } catch (error) {
//         console.error("❌ Error confirming key exchange:", error);
//         throw error;
//       }
//     },
//     []
//   );

//   const sendEncryptedMessage = useCallback(
//     async (roomId, message, friendKeycloakId, replyTo = null) => {
//       try {
//         return await e2eeService.sendEncryptedMessage(
//           roomId,
//           message,
//           friendKeycloakId,
//           replyTo
//         );
//       } catch (error) {
//         console.error("❌ Error sending encrypted message:", error);
//         throw error;
//       }
//     },
//     []
//   );

//   const getFriendKey = useCallback(
//     (friendId) => {
//       return friendKeys[friendId];
//     },
//     [friendKeys]
//   );

//   // 🆕 Function để check socket status
//   const checkSocketStatus = useCallback(() => {
//     const socket = window.socket;
//     return {
//       available: !!socket,
//       connected: socket?.connected || false,
//       ready: socketReady,
//     };
//   }, [socketReady]);

//   const value = {
//     e2eeEnabled,
//     toggleE2EE,
//     myKeys,
//     friendsE2EEStatus,
//     isInitializing,
//     activeKeyExchange,
//     initiateKeyExchange,
//     confirmKeyExchange,
//     sendEncryptedMessage,
//     e2eeService,
//     generateKeyPair,
//     updateE2EEKey,
//     getMyPublicKey,
//     deleteAllKeys,
//     getFriendKey,
//     socketReady,
//     checkSocketStatus,

//     // 🆕 THÊM: autoEncryption
//     autoEncryption: autoEncryptionService, // Trực tiếp từ import
//     isAutoEncryptionReady,
//   };

//   return <E2EEContext.Provider value={value}>{children}</E2EEContext.Provider>;
// };
