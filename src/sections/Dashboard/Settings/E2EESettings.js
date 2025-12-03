// components/settings/E2EESettings.js
import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  Stack,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Grid,
} from "@mui/material";
import {
  Lock,
  Key,
  Trash,
  CheckCircle,
  Warning,
  Copy,
  QrCode,
  Eye,
  EyeSlash,
  Download,
  Upload,
} from "phosphor-react";
import { useE2EE } from "../../../contexts/E2EEContext";
import { useDispatch } from "react-redux";
import { showSnackbar } from "../../../redux/slices/app";

const E2EESettings = () => {
  const dispatch = useDispatch();
  const {
    e2eeEnabled,
    toggleE2EE,
    myKeys,
    isInitializing,
    generateKeyPair,
    getMyPublicKey,
    deleteAllKeys,
    e2eeService,
  } = useE2EE();

  const [regenerating, setRegenerating] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [backupPassword, setBackupPassword] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);

  const [publicKey, setPublicKey] = useState(null);
  const [fingerprint, setFingerprint] = useState("");

  useEffect(() => {
    const loadKeys = async () => {
      if (e2eeEnabled && e2eeService) {
        try {
          const pubKey = await getMyPublicKey();
          if (pubKey) {
            setPublicKey(pubKey);
            const fp = await e2eeService.generateFingerprint(pubKey);
            setFingerprint(fp);
          }
        } catch (error) {
          console.error("❌ Error loading keys:", error);
        }
      }
    };

    loadKeys();
  }, [e2eeEnabled, e2eeService, getMyPublicKey]);

  const handleToggleE2EE = async () => {
    try {
      const newState = !e2eeEnabled;

      if (newState) {
        // Bật E2EE - hiển thị confirm
        if (
          !window.confirm(
            "🔐 Enable End-to-End Encryption?\n\n" +
              "This will generate encryption keys on your device.\n" +
              "Messages will be encrypted so only you and the recipient can read them."
          )
        ) {
          return;
        }
      } else {
        // Tắt E2EE - hiển thị warning
        if (
          !window.confirm(
            "⚠️ Disable End-to-End Encryption?\n\n" +
              "Your messages will no longer be encrypted.\n" +
              "Existing encrypted messages may become unreadable."
          )
        ) {
          return;
        }
      }

      const success = await toggleE2EE(newState);
      if (success) {
        dispatch(
          showSnackbar({
            severity: "success",
            message: `Encryption ${newState ? "enabled" : "disabled"}`,
          })
        );
      }
    } catch (error) {
      console.error("❌ Error toggling E2EE:", error);
      dispatch(
        showSnackbar({
          severity: "error",
          message: error.message || "Failed to toggle encryption",
        })
      );
    }
  };

  const handleRegenerateKeys = async () => {
    try {
      if (
        !window.confirm(
          "⚠️ Generate New Encryption Keys?\n\n" +
            "This will:\n" +
            "• Delete your current keys\n" +
            "• Make old encrypted messages unreadable\n" +
            "• Require re-establishing encryption with contacts\n\n" +
            "Are you sure?"
        )
      ) {
        return;
      }

      setRegenerating(true);

      // Delete old keys
      await deleteAllKeys();

      // Generate new keys
      await generateKeyPair();

      // Refresh UI
      const pubKey = await getMyPublicKey();
      if (pubKey) {
        setPublicKey(pubKey);
        const fp = await e2eeService.generateFingerprint(pubKey);
        setFingerprint(fp);
      }

      dispatch(
        showSnackbar({
          severity: "success",
          message: "New encryption keys generated",
        })
      );
    } catch (error) {
      console.error("❌ Error regenerating keys:", error);
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Failed to regenerate keys",
        })
      );
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopyFingerprint = async () => {
    try {
      await navigator.clipboard.writeText(fingerprint);
      setCopied(true);
      dispatch(
        showSnackbar({
          severity: "success",
          message: "Fingerprint copied to clipboard",
        })
      );
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Failed to copy fingerprint",
        })
      );
    }
  };

  const handleExportKeys = async () => {
    try {
      if (!e2eeService) {
        throw new Error("Encryption service not available");
      }
      setBackupDialogOpen(true);
    } catch (error) {
      console.error("❌ Error exporting keys:", error);
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Failed to export keys",
        })
      );
    }
  };

  const handleConfirmBackup = async () => {
    try {
      if (!backupPassword || backupPassword.length < 8) {
        dispatch(
          showSnackbar({
            severity: "warning",
            message: "Please enter a password with at least 8 characters",
          })
        );
        return;
      }

      const backupData = await e2eeService.exportKeys(backupPassword);

      // Create download
      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `e2ee-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      dispatch(
        showSnackbar({
          severity: "success",
          message: "Backup downloaded successfully",
        })
      );

      setBackupDialogOpen(false);
      setBackupPassword("");
    } catch (error) {
      console.error("❌ Error backing up keys:", error);
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Failed to create backup",
        })
      );
    }
  };

  const handleDeleteAllKeys = async () => {
    try {
      await deleteAllKeys();
      setDeleteDialogOpen(false);
      setPublicKey(null);
      setFingerprint("");

      dispatch(
        showSnackbar({
          severity: "warning",
          message: "All encryption keys deleted",
        })
      );
    } catch (error) {
      console.error("❌ Error deleting keys:", error);
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Failed to delete keys",
        })
      );
    }
  };

  const generateQRCode = () => {
    if (!publicKey || !fingerprint) return null;

    const qrData = JSON.stringify({
      type: "E2EE_PUBLIC_KEY",
      key: publicKey,
      fingerprint: fingerprint,
      timestamp: Date.now(),
    });

    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      qrData
    )}`;
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImportFile(file);
      setImportDialogOpen(true);
    }
  };

  const handleImportKeys = async () => {
    if (!importFile) return;

    try {
      const text = await importFile.text();
      const backupData = JSON.parse(text);

      // Ask for password
      const password = prompt("Enter backup password:");
      if (!password) return;

      await e2eeService.importKeys(backupData, password);

      // Refresh UI
      const pubKey = await getMyPublicKey();
      if (pubKey) {
        setPublicKey(pubKey);
        const fp = await e2eeService.generateFingerprint(pubKey);
        setFingerprint(fp);
      }

      dispatch(
        showSnackbar({
          severity: "success",
          message: "Keys imported successfully",
        })
      );

      setImportDialogOpen(false);
      setImportFile(null);
    } catch (error) {
      console.error("❌ Error importing keys:", error);
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Failed to import keys",
        })
      );
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", p: 3 }}>
      <Typography variant="h4" gutterBottom>
        <Lock size={28} style={{ marginRight: 12, verticalAlign: "middle" }} />
        End-to-End Encryption
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>End-to-End Encryption ensures complete privacy.</strong> Your
        messages are encrypted on your device and can only be decrypted by the
        intended recipient. Not even the server can read your messages.
      </Alert>

      {/* Main toggle */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h6">Enable End-to-End Encryption</Typography>
              <Typography variant="body2" color="text.secondary">
                {e2eeEnabled
                  ? "Your messages are encrypted end-to-end"
                  : "Messages are sent without end-to-end encryption"}
              </Typography>
            </Box>
            <Switch
              checked={e2eeEnabled}
              onChange={handleToggleE2EE}
              disabled={isInitializing || regenerating}
              color="primary"
            />
          </Stack>

          {isInitializing && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <CircularProgress size={16} sx={{ mr: 1 }} />
              Setting up encryption...
            </Alert>
          )}
        </CardContent>
      </Card>

      {e2eeEnabled && publicKey && (
        <>
          {/* Public Key Info */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Key
                  size={20}
                  style={{ marginRight: 8, verticalAlign: "middle" }}
                />
                Your Encryption Key
              </Typography>

              <Alert severity="success" sx={{ mb: 2 }}>
                <CheckCircle size={20} style={{ marginRight: 8 }} />
                Your encryption is active and ready to use
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Key Fingerprint:
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      label={fingerprint}
                      color="primary"
                      icon={<Key size={14} />}
                      sx={{ fontFamily: "monospace", fontSize: "0.9rem" }}
                    />
                    <IconButton
                      size="small"
                      onClick={handleCopyFingerprint}
                      color={copied ? "success" : "default"}
                    >
                      <Copy size={16} />
                    </IconButton>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Share this with contacts to verify your identity
                  </Typography>
                </Grid>

                {generateQRCode() && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Share via QR Code:
                    </Typography>
                    <Box sx={{ textAlign: "center" }}>
                      <img
                        src={generateQRCode()}
                        alt="Public Key QR Code"
                        style={{
                          width: 160,
                          height: 160,
                          border: "1px solid #e0e0e0",
                          borderRadius: 8,
                        }}
                      />
                    </Box>
                  </Grid>
                )}
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  onClick={handleRegenerateKeys}
                  disabled={regenerating}
                  startIcon={
                    regenerating ? <CircularProgress size={16} /> : <Key />
                  }
                >
                  {regenerating ? "Generating..." : "Generate New Keys"}
                </Button>

                <Button
                  variant="outlined"
                  onClick={handleExportKeys}
                  startIcon={<Download />}
                >
                  Backup Keys
                </Button>
              </Stack>

              <Alert severity="warning" sx={{ mt: 2 }}>
                <Warning size={16} style={{ marginRight: 8 }} />
                Generating new keys will break existing encrypted conversations
              </Alert>
            </CardContent>
          </Card>

          {/* Key Management */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Lock
                  size={20}
                  style={{ marginRight: 8, verticalAlign: "middle" }}
                />
                Key Management
              </Typography>

              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>Important:</strong> Your private key is stored only on
                this device. If you lose access to this device, you will lose
                access to encrypted messages. Always create a backup!
              </Alert>

              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Import/Export Keys:
                  </Typography>
                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<Upload />}
                    >
                      Import Backup
                      <input
                        type="file"
                        hidden
                        accept=".json"
                        onChange={handleFileUpload}
                      />
                    </Button>
                  </Stack>
                </Box>

                <Divider />

                <Box sx={{ textAlign: "center" }}>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => setDeleteDialogOpen(true)}
                    startIcon={<Trash />}
                  >
                    Delete All Encryption Keys
                  </Button>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ mt: 1 }}
                  >
                    This will permanently delete all keys and make encrypted
                    messages unreadable
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </>
      )}

      {/* Backup Dialog */}
      <Dialog
        open={backupDialogOpen}
        onClose={() => setBackupDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Backup Encryption Keys</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This backup contains your private key. Keep it secure!
          </Alert>
          <TextField
            autoFocus
            margin="dense"
            label="Backup Password"
            type="password"
            fullWidth
            value={backupPassword}
            onChange={(e) => setBackupPassword(e.target.value)}
            helperText="Choose a strong password to encrypt your backup file"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBackupDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmBackup}
            variant="contained"
            disabled={!backupPassword || backupPassword.length < 8}
          >
            Download Backup
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete All Encryption Keys?</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <strong>⚠️ WARNING: This action cannot be undone!</strong>
          </Alert>
          <Typography variant="body2">
            Deleting your encryption keys will:
          </Typography>
          <List dense sx={{ pl: 2 }}>
            <ListItem sx={{ p: 0 }}>
              <Typography variant="body2">
                • Make all encrypted messages unreadable
              </Typography>
            </ListItem>
            <ListItem sx={{ p: 0 }}>
              <Typography variant="body2">
                • Break all encrypted conversations
              </Typography>
            </ListItem>
            <ListItem sx={{ p: 0 }}>
              <Typography variant="body2">
                • Require generating new keys to use encryption again
              </Typography>
            </ListItem>
          </List>
          <Typography variant="body2" sx={{ mt: 2 }}>
            Are you absolutely sure you want to continue?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteAllKeys}
            variant="contained"
            color="error"
          >
            Delete All Keys
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Import Encryption Keys</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Select a backup file to restore your encryption keys.
          </Alert>
          <Typography variant="body2">
            Selected file: {importFile?.name || "None"}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleImportKeys}
            variant="contained"
            disabled={!importFile}
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for copy feedback */}
      <Snackbar
        open={copied}
        message="Fingerprint copied to clipboard"
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
      />
    </Box>
  );
};

export default E2EESettings;
