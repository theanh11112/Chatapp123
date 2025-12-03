import React from "react";
import {
  Dialog,
  DialogContent,
  Slide,
  Stack,
  Typography,
  Box,
  Avatar,
  Chip,
  CircularProgress,
} from "@mui/material";
import { PhoneDisconnect, User } from "phosphor-react";
import { useTheme } from "@mui/material/styles";
import CallControls from "./CallControls";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const ActiveCallDialog = ({ call, callState, callControls, onClose }) => {
  const theme = useTheme();

  if (!call) return null;

  const {
    callDuration,
    callStatus,
    isConnecting,
    error,
    isCallActive,
    getFormattedDuration,
  } = callState;

  const {
    handleEndCall,
    handleToggleMute,
    handleToggleSpeaker,
    isMuted,
    isSpeakerOn,
    isEnding,
  } = callControls;

  return (
    <Dialog
      open={true}
      fullWidth
      maxWidth="sm"
      onClose={(event, reason) => {
        if (reason !== "backdropClick") {
          handleEndCall();
        }
        onClose?.(event, reason);
      }}
      TransitionComponent={Transition}
      PaperProps={{
        sx: {
          borderRadius: 3,
          height: "60vh",
          overflow: "hidden",
          bgcolor: "background.paper",
          position: "relative",
          boxShadow: theme.shadows[10],
        },
      }}
    >
      <DialogContent sx={{ p: 0, height: "100%", position: "relative" }}>
        <Box
          sx={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <Stack alignItems="center" spacing={3}>
            <Avatar
              src={call.avatar}
              sx={{
                width: 120,
                height: 120,
                border: "4px solid white",
                boxShadow: theme.shadows[10],
              }}
            >
              <User size={60} />
            </Avatar>

            <Box textAlign="center">
              <Typography
                variant="h5"
                fontWeight="bold"
                color="white"
                gutterBottom
              >
                {call.name || "Unknown Caller"}
              </Typography>
              <Typography variant="body1" color="rgba(255,255,255,0.9)">
                {isCallActive
                  ? getFormattedDuration?.() ||
                    `${Math.floor(callDuration / 60)}:${callDuration % 60}`
                  : callStatus}
              </Typography>
              {isConnecting && (
                <Typography variant="caption" color="rgba(255,255,255,0.7)">
                  Connecting... ({callStatus})
                </Typography>
              )}
            </Box>

            {error && (
              <Chip
                label={`Error: ${error}`}
                color="error"
                sx={{
                  color: "white",
                  bgcolor: "error.main",
                  maxWidth: "80%",
                }}
              />
            )}

            {isConnecting && (
              <Stack alignItems="center" spacing={2}>
                <CircularProgress size={60} sx={{ color: "white", mb: 2 }} />
                <Typography variant="h6" color="white">
                  Connecting...
                </Typography>
                <Typography variant="body2" color="rgba(255,255,255,0.8)">
                  {callStatus}
                </Typography>
              </Stack>
            )}

            <CallControls
              onEndCall={handleEndCall}
              onToggleMute={handleToggleMute}
              onToggleSpeaker={handleToggleSpeaker}
              isMuted={isMuted}
              isSpeakerOn={isSpeakerOn}
              isEnding={isEnding}
              isConnecting={isConnecting}
            />
          </Stack>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default React.memo(ActiveCallDialog);
