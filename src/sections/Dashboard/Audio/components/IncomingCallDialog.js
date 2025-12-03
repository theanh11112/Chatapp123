import React from "react";
import {
  Dialog,
  DialogContent,
  Slide,
  Stack,
  Typography,
  Box,
  Avatar,
  Button,
  CircularProgress,
} from "@mui/material";
import { PhoneSlash, Phone, User } from "phosphor-react";
import { useTheme } from "@mui/material/styles";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const IncomingCallDialog = ({
  call,
  onAccept,
  onReject,
  status = "Incoming call...",
  isConnecting = false,
  error = null,
}) => {
  const theme = useTheme();

  if (!call) return null;

  return (
    <Dialog
      open={true}
      onClose={onReject}
      TransitionComponent={Transition}
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxWidth: 400,
          width: "100%",
          background: "linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)",
          boxShadow: "0 10px 30px rgba(106, 17, 203, 0.3)",
        },
      }}
    >
      <DialogContent>
        <Stack spacing={3} alignItems="center" p={3}>
          <Box sx={{ position: "relative" }}>
            <Avatar
              src={call.avatar}
              sx={{
                width: 100,
                height: 100,
                mb: 2,
                border: "3px solid white",
              }}
            >
              <User size={50} />
            </Avatar>
          </Box>

          <Box textAlign="center">
            <Typography variant="h6" fontWeight="bold" color="white">
              {call.name || "Unknown Caller"}
            </Typography>
            <Typography
              variant="body2"
              color="rgba(255,255,255,0.9)"
              sx={{ mt: 1 }}
            >
              Incoming audio call...
            </Typography>
            <Typography
              variant="caption"
              color="rgba(255,255,255,0.7)"
              sx={{ display: "block", mt: 1 }}
            >
              Status: {status}
            </Typography>
          </Box>

          {error && (
            <Typography
              variant="caption"
              color="error.light"
              sx={{ bgcolor: "rgba(255,0,0,0.1)", p: 1, borderRadius: 1 }}
            >
              Error: {error}
            </Typography>
          )}

          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              color="error"
              startIcon={<PhoneSlash size={20} />}
              onClick={onReject}
              disabled={isConnecting}
              sx={{
                minWidth: 120,
                borderRadius: 2,
                fontWeight: "bold",
                textTransform: "none",
              }}
            >
              Decline
            </Button>

            <Button
              variant="contained"
              color="success"
              startIcon={
                isConnecting ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <Phone size={20} />
                )
              }
              onClick={onAccept}
              disabled={isConnecting}
              sx={{
                minWidth: 120,
                borderRadius: 2,
                fontWeight: "bold",
                textTransform: "none",
              }}
            >
              {isConnecting ? "Answering..." : "Answer"}
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default React.memo(IncomingCallDialog);
