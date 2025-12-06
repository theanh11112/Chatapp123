import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  TextField,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import {
  VpnKey as KeyIcon,
  Fingerprint as FingerprintIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import useAutoE2EE from "../hooks/useAutoE2EE";
import { getSocket } from "../../socket";

const KeyManagementPanel = () => {
  const { myFingerprint, isReady, encryptMessage } = useAutoE2EE();
  const [myKeys, setMyKeys] = useState([]);
  const [peerKeys, setPeerKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  console.log("🔍 [KeyManagementPanel] Component mounted:", {
    myFingerprint,
    isReady,
    loading,
    myKeysCount: myKeys.length,
    peerKeysCount: peerKeys.length,
    time: new Date().toLocaleTimeString(),
  });

  useEffect(() => {
    console.log("🔄 [KeyManagementPanel] useEffect triggered");
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      console.log("🔑 [KeyManagementPanel] Loading keys...");
      setLoading(true);

      // Load my keys from localStorage
      const storedKeys = localStorage.getItem("e2ee_keypair");
      console.log("📂 [KeyManagementPanel] Stored keys in localStorage:", {
        hasKeypair: !!storedKeys,
        keyLength: storedKeys?.length,
      });

      if (storedKeys) {
        try {
          const keys = JSON.parse(storedKeys);
          console.log("✅ [KeyManagementPanel] Parsed my keys:", {
            hasPublicKey: !!keys.publicKey,
            hasPrivateKey: !!keys.privateKey,
            fingerprint: keys.fingerprint,
            publicKeyLength: keys.publicKey?.length,
          });

          setMyKeys([
            {
              publicKey: keys.publicKey,
              fingerprint: keys.fingerprint,
              createdAt: new Date(keys.createdAt),
              isActive: true,
              isCurrent: true,
            },
          ]);
        } catch (parseError) {
          console.error(
            "❌ [KeyManagementPanel] Error parsing keypair:",
            parseError
          );
        }
      } else {
        console.log("📭 [KeyManagementPanel] No keypair found in localStorage");
      }

      // Load peer keys from localStorage
      const peerKeysData = localStorage.getItem("e2ee_peer_keys");
      console.log("👥 [KeyManagementPanel] Peer keys data:", {
        hasPeerKeys: !!peerKeysData,
        dataLength: peerKeysData?.length,
      });

      if (peerKeysData) {
        try {
          const parsedPeerKeys = JSON.parse(peerKeysData);
          console.log(
            `✅ [KeyManagementPanel] Parsed ${parsedPeerKeys.length} peer keys`
          );
          setPeerKeys(parsedPeerKeys);
        } catch (parseError) {
          console.error(
            "❌ [KeyManagementPanel] Error parsing peer keys:",
            parseError
          );
        }
      } else {
        console.log("📭 [KeyManagementPanel] No peer keys found");
      }

      console.log("✅ [KeyManagementPanel] Keys loaded successfully:", {
        myKeys: myKeys.length,
        peerKeys: peerKeys.length,
      });
    } catch (error) {
      console.error(
        "❌ [KeyManagementPanel] Error loading keys:",
        error.message,
        error.stack
      );
    } finally {
      setLoading(false);
      console.log("🏁 [KeyManagementPanel] loadKeys completed");
    }
  };

  const handleRegenerateKeys = async () => {
    console.log("🔄 [KeyManagementPanel] handleRegenerateKeys called");

    if (
      !window.confirm(
        "Are you sure? This will generate new encryption keys. Old messages may not be decryptable."
      )
    ) {
      console.log("❌ [KeyManagementPanel] User cancelled key regeneration");
      return;
    }

    try {
      console.log("🔄 [KeyManagementPanel] Regenerating keys...");
      setRegenerating(true);

      const socket = getSocket();
      console.log("🔌 [KeyManagementPanel] Socket check:", {
        hasSocket: !!socket,
        connected: socket?.connected,
      });

      if (!socket) {
        throw new Error("Socket not connected");
      }

      // Generate new key pair
      console.log("🔑 [KeyManagementPanel] Generating new ECDH key pair...");
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: "ECDH",
          namedCurve: "P-256",
        },
        true,
        ["deriveKey", "deriveBits"]
      );
      console.log("✅ [KeyManagementPanel] Key pair generated");

      const publicKey = await window.crypto.subtle.exportKey(
        "jwk",
        keyPair.publicKey
      );
      const privateKey = await window.crypto.subtle.exportKey(
        "jwk",
        keyPair.privateKey
      );
      console.log("📤 [KeyManagementPanel] Keys exported");

      const publicKeyStr = JSON.stringify(publicKey);
      const fingerprint = calculateFingerprint(publicKeyStr);
      console.log(
        "🆔 [KeyManagementPanel] Fingerprint calculated:",
        fingerprint
      );

      // Save locally
      localStorage.setItem(
        "e2ee_keypair",
        JSON.stringify({
          publicKey: publicKeyStr,
          privateKey: JSON.stringify(privateKey),
          fingerprint,
          createdAt: Date.now(),
        })
      );
      console.log("💾 [KeyManagementPanel] Keys saved to localStorage");

      // Update on server
      console.log("📡 [KeyManagementPanel] Updating key on server...");
      await new Promise((resolve, reject) => {
        socket.emit(
          "update_e2ee_key",
          {
            publicKey: publicKeyStr,
            keyType: "ecdh",
          },
          (response) => {
            console.log(
              "📥 [KeyManagementPanel] Server response for update_e2ee_key:",
              {
                response,
                type: typeof response,
              }
            );

            if (
              response &&
              (response.success === true ||
                (typeof response === "string" &&
                  response.includes("success")) ||
                (response.message && response.message.includes("success")))
            ) {
              console.log("✅ [KeyManagementPanel] Server accepted new key");
              resolve(response);
            } else {
              console.error(
                "❌ [KeyManagementPanel] Server rejected new key:",
                response
              );
              reject(new Error(response?.error || "Server rejected key"));
            }
          }
        );
      });

      // Reload keys
      await loadKeys();

      console.log("✅ [KeyManagementPanel] Keys regenerated successfully");
      alert("New encryption keys generated successfully!");
    } catch (error) {
      console.error(
        "❌ [KeyManagementPanel] Error regenerating keys:",
        error.message,
        error.stack
      );
      alert(`Error: ${error.message}`);
    } finally {
      setRegenerating(false);
      console.log("🏁 [KeyManagementPanel] handleRegenerateKeys completed");
    }
  };

  const handleDeleteKey = (fingerprint) => {
    console.log("🗑️ [KeyManagementPanel] handleDeleteKey called:", {
      fingerprint,
    });
    setDeleteDialog({
      fingerprint,
      type: "my",
    });
  };

  const handleDeletePeerKey = (peerId) => {
    console.log("🗑️ [KeyManagementPanel] handleDeletePeerKey called:", {
      peerId,
    });
    setDeleteDialog({
      peerId,
      type: "peer",
    });
  };

  const confirmDelete = () => {
    const { fingerprint, peerId, type } = deleteDialog;
    console.log("✅ [KeyManagementPanel] confirmDelete called:", {
      fingerprint,
      peerId,
      type,
    });

    try {
      if (type === "my") {
        // Can't delete current active key
        const isCurrent = myKeys.find(
          (k) => k.fingerprint === fingerprint
        )?.isCurrent;

        console.log("🔍 [KeyManagementPanel] Checking if key is current:", {
          fingerprint,
          isCurrent,
        });

        if (isCurrent) {
          console.log(
            "❌ [KeyManagementPanel] Cannot delete current active key"
          );
          alert(
            "Cannot delete current active key. Please generate new keys first."
          );
          return;
        }

        // Remove from localStorage
        localStorage.removeItem("e2ee_keypair");
        setMyKeys([]);
        console.log(
          "🗑️ [KeyManagementPanel] My key deleted from localStorage:",
          fingerprint
        );
      } else {
        // Remove peer key
        const updatedPeerKeys = peerKeys.filter((k) => k.peerId !== peerId);
        localStorage.setItem("e2ee_peer_keys", JSON.stringify(updatedPeerKeys));
        setPeerKeys(updatedPeerKeys);
        console.log("🗑️ [KeyManagementPanel] Peer key deleted:", {
          peerId,
          remaining: updatedPeerKeys.length,
        });
      }

      console.log("✅ [KeyManagementPanel] Key deletion successful");
      alert("Key deleted successfully");
    } catch (error) {
      console.error(
        "❌ [KeyManagementPanel] Error deleting key:",
        error.message,
        error.stack
      );
      alert(`Error: ${error.message}`);
    } finally {
      setDeleteDialog(null);
      console.log("🏁 [KeyManagementPanel] confirmDelete completed");
    }
  };

  const copyToClipboard = (text) => {
    console.log("📋 [KeyManagementPanel] copyToClipboard called:", {
      textLength: text.length,
      textPreview: text.substring(0, 30) + "...",
    });

    navigator.clipboard
      .writeText(text)
      .then(() => {
        console.log("✅ [KeyManagementPanel] Copied to clipboard");
        setCopySuccess(true);
        setTimeout(() => {
          console.log("🕒 [KeyManagementPanel] Copy success timeout");
          setCopySuccess(false);
        }, 2000);
      })
      .catch((err) => {
        console.error("❌ [KeyManagementPanel] Clipboard error:", err);
      });
  };

  const calculateFingerprint = (key) => {
    console.log(
      "🆔 [KeyManagementPanel] calculateFingerprint called, key length:",
      key.length
    );
    // Simple fingerprint calculation
    const hash = Array.from(new TextEncoder().encode(key))
      .reduce((acc, byte) => acc + byte.toString(16).padStart(2, "0"), "")
      .substring(0, 16)
      .toUpperCase();
    const result = hash.match(/.{1,4}/g).join(" ");
    console.log("✅ [KeyManagementPanel] Fingerprint calculated:", result);
    return result;
  };

  if (loading) {
    console.log("⏳ [KeyManagementPanel] Loading state, showing spinner");
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  console.log("🎨 [KeyManagementPanel] Rendering component");
  return (
    <Box>
      {/* My Keys Section */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h6">
            <KeyIcon sx={{ mr: 1, verticalAlign: "middle" }} />
            My Encryption Keys
          </Typography>
          <Button
            variant="outlined"
            startIcon={
              regenerating ? <CircularProgress size={20} /> : <RefreshIcon />
            }
            onClick={handleRegenerateKeys}
            disabled={regenerating}
          >
            {regenerating ? "Regenerating..." : "Generate New Keys"}
          </Button>
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          Your fingerprint identifies your encryption key. Share it with friends
          to verify secure connections.
        </Alert>

        {myKeys.length > 0 ? (
          <List>
            {myKeys.map((key, index) => (
              <React.Fragment key={key.fingerprint}>
                <ListItem>
                  <ListItemIcon>
                    {key.isCurrent ? (
                      <StarIcon color="warning" />
                    ) : (
                      <StarBorderIcon />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body1" fontWeight={500}>
                          Key {index + 1}
                        </Typography>
                        {key.isCurrent && (
                          <Chip label="Active" size="small" color="primary" />
                        )}
                        <Chip
                          label={key.isActive ? "Active" : "Inactive"}
                          size="small"
                          color={key.isActive ? "success" : "default"}
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Fingerprint: {key.fingerprint}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          Created:{" "}
                          {new Date(key.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="Copy fingerprint">
                      <IconButton
                        onClick={() => copyToClipboard(key.fingerprint)}
                      >
                        <CopyIcon />
                      </IconButton>
                    </Tooltip>
                    {!key.isCurrent && (
                      <Tooltip title="Delete key">
                        <IconButton
                          onClick={() => handleDeleteKey(key.fingerprint)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
                {index < myKeys.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Alert severity="warning">
            No encryption keys found. Generate keys to enable end-to-end
            encryption.
          </Alert>
        )}
      </Paper>

      {/* Peer Keys Section */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" mb={2}>
          <FingerprintIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          Friends' Keys
        </Typography>

        {peerKeys.length > 0 ? (
          <List>
            {peerKeys.map((peer, index) => (
              <React.Fragment key={peer.peerId}>
                <ListItem>
                  <ListItemIcon>
                    {peer.verified ? (
                      <CheckCircleIcon color="success" />
                    ) : (
                      <WarningIcon color="warning" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={peer.username || peer.peerId}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Fingerprint: {peer.fingerprint}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          Last updated:{" "}
                          {new Date(peer.lastUpdated).toLocaleDateString()}
                          {peer.verified && " • Verified"}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="Copy fingerprint">
                      <IconButton
                        onClick={() => copyToClipboard(peer.fingerprint)}
                      >
                        <CopyIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete key">
                      <IconButton
                        onClick={() => handleDeletePeerKey(peer.peerId)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < peerKeys.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Alert severity="info">
            No friend keys found. Start chatting with friends to exchange
            encryption keys.
          </Alert>
        )}
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)}>
        <DialogTitle>Delete Encryption Key</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Warning: Deleting encryption keys may prevent you from decrypting
            old messages!
          </Alert>
          <Typography>
            Are you sure you want to delete this key? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(null)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Copy Success Snackbar */}
      {copySuccess && (
        <Alert
          severity="success"
          sx={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999 }}
        >
          Fingerprint copied to clipboard!
        </Alert>
      )}
    </Box>
  );
};

export default KeyManagementPanel;
