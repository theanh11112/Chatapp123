import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  TextField,
  Alert,
  Stack,
} from "@mui/material";
import { Lock, Key, Shield, CheckCircle, Warning } from "phosphor-react";
import { useE2EE } from "../../../../contexts/E2EEContext";

const KeyExchangeDialog = ({ open, onClose, exchangeRequest }) => {
  const { confirmKeyExchange } = useE2EE();
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!exchangeRequest) return null;

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await confirmKeyExchange(
        exchangeRequest.exchangeId,
        exchangeRequest.from,
        verified
      );
      onClose();
    } catch (error) {
      console.error("❌ Error confirming key exchange:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = () => {
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Key size={24} />
          <Typography variant="h6">Key Exchange Request</Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          <Alert severity="info">
            <Typography variant="body2">
              <strong>{exchangeRequest.username}</strong> wants to establish
              End-to-End Encryption with you.
            </Typography>
          </Alert>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Key Fingerprint:
            </Typography>
            <Chip
              label={exchangeRequest.fingerprint}
              color="primary"
              icon={<Shield size={16} />}
              sx={{ fontFamily: "monospace", fontSize: "0.9rem" }}
            />
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Public Key:
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={exchangeRequest.publicKey}
              InputProps={{
                readOnly: true,
              }}
              variant="outlined"
              size="small"
            />
            <Typography variant="caption" color="text.secondary">
              Verify this fingerprint with your friend through another secure
              channel
            </Typography>
          </Box>

          <Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Button
                variant={verified ? "contained" : "outlined"}
                color={verified ? "success" : "default"}
                startIcon={verified ? <CheckCircle /> : <Warning />}
                onClick={() => setVerified(!verified)}
                fullWidth
              >
                {verified ? "Verified" : "Mark as Verified"}
              </Button>

              <Typography variant="caption" color="text.secondary">
                Only verify if you have confirmed the fingerprint with{" "}
                {exchangeRequest.username}
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleReject} disabled={loading}>
          Reject
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="primary"
          disabled={loading || !verified}
          startIcon={<Lock />}
        >
          {loading ? "Confirming..." : "Confirm & Enable E2EE"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default KeyExchangeDialog;
