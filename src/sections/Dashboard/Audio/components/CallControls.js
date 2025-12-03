import React from "react";
import { Stack, IconButton, CircularProgress } from "@mui/material";
import {
  Microphone,
  MicrophoneSlash,
  SpeakerHigh,
  SpeakerLow,
  PhoneDisconnect,
} from "phosphor-react";
import { useTheme } from "@mui/material/styles";

const CallControls = ({
  onEndCall,
  onToggleMute,
  onToggleSpeaker,
  isMuted = false,
  isSpeakerOn = true,
  isEnding = false,
  isConnecting = false,
}) => {
  const theme = useTheme();

  return (
    <Stack direction="row" spacing={2}>
      <IconButton
        onClick={onToggleMute}
        sx={{
          backgroundColor: isMuted
            ? theme.palette.error.main
            : "rgba(255,255,255,0.1)",
          color: "white",
          width: 56,
          height: 56,
          "&:hover": {
            backgroundColor: isMuted
              ? theme.palette.error.dark
              : "rgba(255,255,255,0.2)",
          },
        }}
        disabled={isEnding || isConnecting}
      >
        {isMuted ? <MicrophoneSlash size={24} /> : <Microphone size={24} />}
      </IconButton>

      <IconButton
        onClick={onToggleSpeaker}
        sx={{
          backgroundColor: "rgba(255,255,255,0.1)",
          color: "white",
          width: 56,
          height: 56,
          "&:hover": {
            backgroundColor: "rgba(255,255,255,0.2)",
          },
        }}
        disabled={isEnding || isConnecting}
      >
        {isSpeakerOn ? <SpeakerHigh size={24} /> : <SpeakerLow size={24} />}
      </IconButton>

      <IconButton
        onClick={onEndCall}
        sx={{
          backgroundColor: theme.palette.error.main,
          color: "white",
          width: 56,
          height: 56,
          "&:hover": {
            backgroundColor: theme.palette.error.dark,
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
    </Stack>
  );
};

export default React.memo(CallControls);
