import React, { memo } from "react";
import { Stack, IconButton, CircularProgress, Tooltip } from "@mui/material";
import {
  Microphone,
  MicrophoneSlash,
  SpeakerHigh,
  SpeakerLow,
  PhoneDisconnect,
} from "phosphor-react";
import { useTheme } from "@mui/material/styles";

const CallControls = memo(
  ({
    onEndCall,
    onToggleMute,
    onToggleSpeaker,
    isMuted = false,
    isSpeakerOn = true,
    isEnding = false,
    isConnecting = false,
  }) => {
    const theme = useTheme();

    // Prevent rapid clicks
    const handleButtonClick = (callback) => {
      if (isEnding || isConnecting) return;
      callback();
    };

    return (
      <Stack
        direction="row"
        spacing={2}
        sx={{
          transition: "all 0.3s ease",
          opacity: isEnding || isConnecting ? 0.6 : 1,
        }}
      >
        <Tooltip title={isMuted ? "Unmute" : "Mute"}>
          <IconButton
            onClick={() => handleButtonClick(onToggleMute)}
            sx={{
              backgroundColor: isMuted
                ? theme.palette.error.main
                : "rgba(255,255,255,0.1)",
              color: "white",
              width: 56,
              height: 56,
              transition: "all 0.2s ease",
              "&:hover:not(:disabled)": {
                backgroundColor: isMuted
                  ? theme.palette.error.dark
                  : "rgba(255,255,255,0.2)",
                transform: "scale(1.1)",
              },
              "&:disabled": {
                cursor: "not-allowed",
              },
            }}
            disabled={isEnding || isConnecting}
          >
            {isMuted ? <MicrophoneSlash size={24} /> : <Microphone size={24} />}
          </IconButton>
        </Tooltip>

        <Tooltip title={isSpeakerOn ? "Speaker off" : "Speaker on"}>
          <IconButton
            onClick={() => handleButtonClick(onToggleSpeaker)}
            sx={{
              backgroundColor: "rgba(255,255,255,0.1)",
              color: "white",
              width: 56,
              height: 56,
              transition: "all 0.2s ease",
              "&:hover:not(:disabled)": {
                backgroundColor: "rgba(255,255,255,0.2)",
                transform: "scale(1.1)",
              },
              "&:disabled": {
                cursor: "not-allowed",
              },
            }}
            disabled={isEnding || isConnecting}
          >
            {isSpeakerOn ? <SpeakerHigh size={24} /> : <SpeakerLow size={24} />}
          </IconButton>
        </Tooltip>

        <Tooltip title={isEnding ? "Ending call..." : "End call"}>
          <IconButton
            onClick={() => handleButtonClick(onEndCall)}
            sx={{
              backgroundColor: theme.palette.error.main,
              color: "white",
              width: 56,
              height: 56,
              transition: "all 0.2s ease",
              "&:hover:not(:disabled)": {
                backgroundColor: theme.palette.error.dark,
                transform: "scale(1.1)",
              },
              "&:disabled": {
                cursor: "not-allowed",
                backgroundColor: theme.palette.error.light,
              },
            }}
            disabled={isEnding}
          >
            {isEnding ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              <PhoneDisconnect size={24} />
            )}
          </IconButton>
        </Tooltip>
      </Stack>
    );
  }
);

// Display name cho debugging
CallControls.displayName = "CallControls";

export default CallControls;
