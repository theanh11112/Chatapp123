// ActiveCallDialog.js - THÊM DEBUG VÀ OPTIMIZE
import React, { useState, useEffect, useRef } from "react";
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

// 🔴 COMPONENT CON CHO DURATION - GIẢM RE-RENDER
const CallDurationDisplay = React.memo(
  ({ formattedDuration, isCallActive }) => {
    const [displayTime, setDisplayTime] = useState("00:00");

    useEffect(() => {
      // if (isCallActive) {
      //   // 🔴 CẬP NHẬT MỖI GIÂY NHƯNG KHÔNG RE-RENDER PARENT
      //   const interval = setInterval(() => {
      //     setDisplayTime(formattedDuration);
      //   }, 1000);
      //   return () => clearInterval(interval);
      // } else {
      //   setDisplayTime("00:00");
      // }
    }, [formattedDuration, isCallActive]);

    return (
      <Typography variant="body1" color="rgba(255,255,255,0.9)">
        {displayTime}
      </Typography>
    );
  }
);

CallDurationDisplay.displayName = "CallDurationDisplay";

const ActiveCallDialog = ({
  call,
  callState,
  callControls,
  onClose,
  uiState, // 🔴 NHẬN uiState TỪ useAudioCall
}) => {
  const theme = useTheme();
  const renderCount = useRef(0);

  // 🔴 DEBUG RE-RENDER
  useEffect(() => {
    // renderCount.current += 1;
    // console.log(`🔄 ActiveCallDialog re-render #${renderCount.current}`, {
    //   time: new Date().toISOString(),
    //   callStatus: callState.callStatus,
    //   isConnecting: callState.isConnecting,
    //   error: callState.error,
    //   hasCall: !!call,
    //   formattedDuration: uiState?.formattedDuration || "00:00",
    // });
  });

  if (!call) return null;

  const { callStatus, isConnecting, error, isCallActive } = callState;

  const {
    handleEndCall,
    handleToggleMute,
    handleToggleSpeaker,
    isMuted,
    isSpeakerOn,
    isEnding,
  } = callControls;

  const { formattedDuration, callName, callAvatar } = uiState || {};

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
              src={callAvatar}
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
                {callName || "Unknown Caller"}
              </Typography>

              {/* 🔴 SỬ DỤNG COMPONENT CON CHO DURATION */}
              <CallDurationDisplay
                formattedDuration={formattedDuration}
                isCallActive={isCallActive}
              />

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

// 🔴 SỬ DỤNG CUSTOM COMPARISON FUNCTION
const arePropsEqual = (prevProps, nextProps) => {
  // Chỉ re-render nếu các props quan trọng thay đổi
  return (
    prevProps.call?.id === nextProps.call?.id &&
    prevProps.callState.callStatus === nextProps.callState.callStatus &&
    prevProps.callState.isConnecting === nextProps.callState.isConnecting &&
    prevProps.callState.error === nextProps.callState.error &&
    prevProps.uiState?.formattedDuration ===
      nextProps.uiState?.formattedDuration &&
    prevProps.callControls.isMuted === nextProps.callControls.isMuted &&
    prevProps.callControls.isSpeakerOn === nextProps.callControls.isSpeakerOn &&
    prevProps.callControls.isEnding === nextProps.callControls.isEnding
  );
};

export default React.memo(ActiveCallDialog, arePropsEqual);
