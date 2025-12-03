import React from "react";
import { useAudioCall } from "./hooks/useAudioCall";
import IncomingCallDialog from "./components/IncomingCallDialog";
import ActiveCallDialog from "./components/ActiveCallDialog";
import { log } from "./utils/audioCallLogger";

const AudioCallDialog = () => {
  const { currentCall, callState, callControls, uiState } = useAudioCall();

  log.debug("Render", "AudioCallDialog rendering", {
    hasCurrentCall: !!currentCall,
    shouldOpenDialog: uiState.shouldOpenDialog,
    shouldOpenNotification: uiState.shouldOpenNotification,
    callName: uiState.callName,
  });

  if (!currentCall) {
    log.warn("Render", "No current call, returning null");
    return null;
  }

  return (
    <>
      {uiState.shouldOpenNotification && (
        <IncomingCallDialog
          call={currentCall}
          onAccept={callControls.handleAccept}
          onReject={callControls.handleReject}
          status={callState.callStatus}
          isConnecting={callState.isConnecting}
          error={callState.error}
        />
      )}

      {uiState.shouldOpenDialog && (
        <ActiveCallDialog
          call={currentCall}
          callState={callState}
          callControls={callControls}
        />
      )}
    </>
  );
};

// Debug export for development
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  window.debugAudioCall = {
    getState: () => ({
      currentCall: useAudioCall.currentCall,
      callState: useAudioCall.callState,
      uiState: useAudioCall.uiState,
    }),
    version: "2.0.0-refactored",
  };
}

export default React.memo(AudioCallDialog);
