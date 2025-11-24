import { createSlice } from "@reduxjs/toolkit";
import { showSnackbar } from "./app";
import { FetchCallLogs } from "./app";
import { socket } from "../../socket";
import api from "../../utils/axios";

const initialState = {
  open_audio_dialog: false,
  open_audio_notification_dialog: false,
  call_queue: [], // can have max 1 call at any point of time
  incoming: false,

  // WebRTC & Call State
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  isCallActive: false,
  callType: null, // 'direct' or 'group'
  callRoom: null,
  participants: [],
  callDuration: 0,
  isMuted: false,
  isSpeakerOn: true,
  callStatus: "idle", // 'idle', 'calling', 'ringing', 'connected', 'ended'
  callStartTime: null,
  callEndTime: null,
  zegoEngine: null,
  zegoToken: null,
};

const slice = createSlice({
  name: "audioCall",
  initialState,
  reducers: {
    pushToAudioCallQueue(state, action) {
      // Only allow one call at a time
      if (state.call_queue.length === 0) {
        state.call_queue.push(action.payload.call);
        if (action.payload.incoming) {
          state.open_audio_notification_dialog = true;
          state.incoming = true;
          state.callStatus = "ringing";
        } else {
          state.open_audio_dialog = true;
          state.incoming = false;
          state.callStatus = "calling";
        }
      } else {
        // Notify that user is busy
        socket.emit("user_is_busy_audio_call", { ...action.payload });
      }
    },

    resetAudioCallQueue(state, action) {
      state.call_queue = [];
      state.open_audio_notification_dialog = false;
      state.incoming = false;
      state.callStatus = "idle";
    },

    closeNotificationDialog(state, action) {
      state.open_audio_notification_dialog = false;
    },

    updateCallDialog(state, action) {
      state.open_audio_dialog = action.payload.state;
      state.open_audio_notification_dialog = false;
    },

    // WebRTC & Media Actions
    setLocalStream(state, action) {
      state.localStream = action.payload;
    },

    setRemoteStream(state, action) {
      state.remoteStream = action.payload;
    },

    setPeerConnection(state, action) {
      state.peerConnection = action.payload;
    },

    setCallActive(state, action) {
      state.isCallActive = action.payload;
      if (action.payload) {
        state.callStatus = "connected";
        state.callStartTime = new Date().toISOString();
      } else {
        state.callStatus = "ended";
        state.callEndTime = new Date().toISOString();
      }
    },

    setCallType(state, action) {
      state.callType = action.payload;
    },

    setCallRoom(state, action) {
      state.callRoom = action.payload;
    },

    setParticipants(state, action) {
      state.participants = action.payload;
    },

    updateCallDuration(state, action) {
      state.callDuration = action.payload;
    },

    toggleMute(state, action) {
      state.isMuted = action.payload;
      if (state.localStream) {
        state.localStream.getAudioTracks().forEach((track) => {
          track.enabled = !action.payload;
        });
      }
    },

    toggleSpeaker(state, action) {
      state.isSpeakerOn = action.payload;
    },

    setCallStatus(state, action) {
      state.callStatus = action.payload;
    },

    setZegoEngine(state, action) {
      state.zegoEngine = action.payload;
    },

    setZegoToken(state, action) {
      state.zegoToken = action.payload;
    },

    addParticipant(state, action) {
      if (!state.participants.find((p) => p.id === action.payload.id)) {
        state.participants.push(action.payload);
      }
    },

    removeParticipant(state, action) {
      state.participants = state.participants.filter(
        (p) => p.id !== action.payload
      );
    },

    updateParticipant(state, action) {
      const index = state.participants.findIndex(
        (p) => p.id === action.payload.id
      );
      if (index !== -1) {
        state.participants[index] = {
          ...state.participants[index],
          ...action.payload,
        };
      }
    },

    resetCallState(state, action) {
      // Reset only call-related states, keep dialog states
      const {
        open_audio_dialog,
        open_audio_notification_dialog,
        call_queue,
        incoming,
      } = state;

      Object.assign(state, {
        ...initialState,
        open_audio_dialog,
        open_audio_notification_dialog,
        call_queue,
        incoming,
      });
    },

    // Complete reset
    completeReset(state, action) {
      Object.assign(state, initialState);
    },
  },
});

// Reducer
export default slice.reducer;

// Export all actions
export const {
  pushToAudioCallQueue,
  resetAudioCallQueue,
  closeNotificationDialog,
  updateCallDialog,
  setLocalStream,
  setRemoteStream,
  setPeerConnection,
  setCallActive,
  setCallType,
  setCallRoom,
  setParticipants,
  updateCallDuration,
  toggleMute,
  toggleSpeaker,
  setCallStatus,
  setZegoEngine,
  setZegoToken,
  addParticipant,
  removeParticipant,
  updateParticipant,
  resetCallState,
  completeReset,
} = slice.actions;

// Thunk Actions
export const StartAudioCall = (to, callType = "direct", roomID = null) => {
  return async (dispatch, getState) => {
    dispatch(completeReset());

    try {
      const state = getState();
      const from = state.app.user?.keycloakId;

      if (!from) {
        throw new Error("User not authenticated");
      }

      const finalRoomID = roomID || `audio-${from}-${to}-${Date.now()}`;

      console.log("📞 Starting audio call:", { from, to, roomID: finalRoomID });

      const response = await api.post("/call/start-audio-call", {
        from,
        to,
        roomID: finalRoomID,
      });

      console.log("✅ Audio call started:", response.data);

      const callData = {
        id: response.data.callId,
        roomID: response.data.roomID,
        from: from,
        to: to,
        callType: callType,
        name: "User", // Will be updated with real user data
        avatar: "",
        timestamp: new Date().toISOString(),
        ...response.data,
      };

      dispatch(
        pushToAudioCallQueue({
          call: callData,
          incoming: false,
        })
      );

      dispatch(setCallType(callType));
      dispatch(setCallRoom(response.data.roomID));

      return response.data;
    } catch (err) {
      console.error("❌ Start audio call error:", err);
      dispatch(
        showSnackbar({
          severity: "error",
          message: err.response?.data?.message || "Failed to start audio call",
        })
      );
      throw err;
    }
  };
};

export const StartGroupAudioCall = (
  participants,
  roomID = null,
  callTitle = "Group Call"
) => {
  return async (dispatch, getState) => {
    dispatch(completeReset());

    try {
      const state = getState();
      const from = state.app.user?.keycloakId;

      if (!from) {
        throw new Error("User not authenticated");
      }

      const finalRoomID = roomID || `group-${from}-${Date.now()}`;
      const allParticipants = [...new Set([...participants, from])];

      console.log("👥 Starting group audio call:", {
        from,
        participants: allParticipants,
        roomID: finalRoomID,
      });

      const response = await api.post("/call/start-group-audio-call", {
        from,
        participants: allParticipants.filter((p) => p !== from),
        roomID: finalRoomID,
        callTitle,
      });

      console.log("✅ Group audio call started:", response.data);

      const callData = {
        id: response.data.callId,
        roomID: response.data.roomID,
        from: from,
        participants: allParticipants,
        callType: "group",
        name: callTitle,
        avatar: "",
        timestamp: new Date().toISOString(),
        ...response.data,
      };

      dispatch(
        pushToAudioCallQueue({
          call: callData,
          incoming: false,
        })
      );

      dispatch(setCallType("group"));
      dispatch(setCallRoom(response.data.roomID));
      dispatch(
        setParticipants(
          allParticipants.map((id) => ({
            id,
            status: id === from ? "joined" : "invited",
          }))
        )
      );

      return response.data;
    } catch (err) {
      console.error("❌ Start group audio call error:", err);
      dispatch(
        showSnackbar({
          severity: "error",
          message:
            err.response?.data?.message || "Failed to start group audio call",
        })
      );
      throw err;
    }
  };
};

export const AcceptAudioCall = () => {
  return async (dispatch, getState) => {
    const state = getState().audioCall;
    const currentCall = state.call_queue[0];
    const userState = getState();
    const userId = userState.app.user?.keycloakId;

    try {
      if (!currentCall || !userId) {
        throw new Error("No active call or user not authenticated");
      }

      console.log("✅ Accepting call:", {
        callId: currentCall.id,
        userId,
      });

      // Update call status in backend
      await api.post("/call/update-call-status", {
        callId: currentCall.id,
        userId: userId,
        status: "accepted",
      });

      // Notify caller via socket
      socket.emit("audio_call_accepted", {
        callId: currentCall.id,
        roomId: currentCall.roomID,
        to: currentCall.from,
        acceptedBy: userId,
      });

      dispatch(closeNotificationDialog());
      dispatch(updateCallDialog({ state: true }));
      dispatch(setCallStatus("connected"));
      dispatch(setCallActive(true));
    } catch (error) {
      console.error("❌ Accept audio call error:", error);
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Failed to accept call",
        })
      );
    }
  };
};

export const RejectAudioCall = () => {
  return async (dispatch, getState) => {
    const state = getState().audioCall;
    const currentCall = state.call_queue[0];
    const userState = getState();
    const userId = userState.app.user?.keycloakId;

    try {
      if (!currentCall || !userId) {
        throw new Error("No active call or user not authenticated");
      }

      console.log("❌ Rejecting call:", {
        callId: currentCall.id,
        userId,
      });

      // Update call status in backend
      await api.post("/call/update-call-status", {
        callId: currentCall.id,
        userId: userId,
        status: "declined",
      });

      // Notify caller via socket
      socket.emit("audio_call_rejected", {
        callId: currentCall.id,
        roomId: currentCall.roomID,
        to: currentCall.from,
        rejectedBy: userId,
      });

      dispatch(completeReset());
    } catch (error) {
      console.error("❌ Reject audio call error:", error);
      dispatch(completeReset());
    }
  };
};

export const EndAudioCall = () => {
  return async (dispatch, getState) => {
    const state = getState().audioCall;
    const currentCall = state.call_queue[0];
    const userState = getState();
    const userId = userState.app.user?.keycloakId;

    try {
      if (!currentCall || !userId) {
        throw new Error("No active call or user not authenticated");
      }

      console.log("📴 Ending call:", {
        callId: currentCall.id,
        userId,
        duration: state.callDuration,
      });

      // Update call status in backend
      await api.post("/call/end-call", {
        callId: currentCall.id,
        endedBy: userId,
        duration: state.callDuration,
      });

      // Notify participants via socket
      socket.emit("audio_call_ended", {
        callId: currentCall.id,
        roomId: currentCall.roomID,
        endedBy: userId,
        duration: state.callDuration,
      });

      // Refresh call logs
      if (userId) {
        dispatch(FetchCallLogs(userId));
      }

      dispatch(completeReset());
    } catch (error) {
      console.error("❌ End audio call error:", error);
      dispatch(completeReset());
    }
  };
};

export const ToggleMuteAudio = () => {
  return async (dispatch, getState) => {
    const state = getState().audioCall;
    const newMuteState = !state.isMuted;

    dispatch(toggleMute(newMuteState));

    // Emit mute state to other participants
    if (state.callRoom) {
      socket.emit("audio_call_mute_toggled", {
        isMuted: newMuteState,
        roomId: state.callRoom,
      });
    }
  };
};

export const ToggleSpeakerAudio = () => {
  return async (dispatch, getState) => {
    const state = getState().audioCall;
    dispatch(toggleSpeaker(!state.isSpeakerOn));
  };
};

export const UpdateCallDuration = () => {
  return async (dispatch, getState) => {
    const state = getState().audioCall;
    if (state.isCallActive) {
      dispatch(updateCallDuration(state.callDuration + 1));
    }
  };
};

// Existing actions for backward compatibility
export const PushToAudioCallQueue = (call) => {
  return async (dispatch, getState) => {
    dispatch(pushToAudioCallQueue({ call, incoming: true }));
  };
};

export const ResetAudioCallQueue = () => {
  return async (dispatch, getState) => {
    dispatch(resetAudioCallQueue());
  };
};

export const CloseAudioNotificationDialog = () => {
  return async (dispatch, getState) => {
    dispatch(closeNotificationDialog());
  };
};

export const UpdateAudioCallDialog = ({ state }) => {
  return async (dispatch, getState) => {
    dispatch(updateCallDialog({ state }));
  };
};
