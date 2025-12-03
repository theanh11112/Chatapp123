// redux/slices/videoCall.js - CẬP NHẬT CHO WEBRTC
import { createSlice } from "@reduxjs/toolkit";
import { showSnackbar } from "./app";

const initialState = {
  open_video_dialog: false,
  open_video_notification_dialog: false,
  call_queue: [], // can have max 1 call at any point of time
  incoming: false,
  isCallActive: false,
  callType: "direct",
  participants: [],
  callDuration: 0,
  isMuted: false,
  isVideoOff: false,

  // 🆕 WebRTC States
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  callRoom: null,
  callStatus: "idle", // 'idle', 'calling', 'ringing', 'connecting', 'connected', 'ending', 'ended'
  callStartTime: null,
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
  connectionState: "disconnected",
  dataChannel: null,
};

const slice = createSlice({
  name: "videoCall",
  initialState,
  reducers: {
    pushToVideoCallQueue(state, action) {
      if (state.call_queue.length === 0) {
        state.call_queue.push(action.payload.call);
        if (action.payload.incoming) {
          state.open_video_notification_dialog = true;
          state.incoming = true;
          state.callStatus = "ringing";
        } else {
          state.open_video_dialog = true;
          state.incoming = false;
          state.callStatus = "calling";
        }
      } else {
        // Notify that user is busy
        console.warn("User is already in a video call");
      }
    },

    resetVideoCallQueue(state, action) {
      state.call_queue = [];
      state.open_video_notification_dialog = false;
      state.open_video_dialog = false;
      state.incoming = false;
      state.isCallActive = false;
      state.callStatus = "idle";
      state.connectionState = "disconnected";
      state.callDuration = 0;
    },

    closeNotificationDialog(state, action) {
      state.open_video_notification_dialog = false;
    },

    updateCallDialog(state, action) {
      state.open_video_dialog = action.payload.state;
      state.open_video_notification_dialog = false;
    },

    setCallActive(state, action) {
      state.isCallActive = action.payload;
      if (action.payload) {
        state.callStatus = "connected";
        state.callStartTime = new Date().toISOString();
      } else {
        state.callStatus = "ended";
      }
    },

    updateCallDuration(state, action) {
      state.callDuration = action.payload;
    },

    incrementCallDuration(state, action) {
      if (state.isCallActive) {
        state.callDuration += 1;
      }
    },

    toggleMute(state, action) {
      state.isMuted = !state.isMuted;
    },

    toggleVideo(state, action) {
      state.isVideoOff = !state.isVideoOff;
    },

    // 🆕 WebRTC Reducers
    setLocalStream(state, action) {
      state.localStream = action.payload;
    },

    setRemoteStream(state, action) {
      state.remoteStream = action.payload;
    },

    setPeerConnection(state, action) {
      state.peerConnection = action.payload;
    },

    setCallRoom(state, action) {
      state.callRoom = action.payload;
    },

    setCallStatus(state, action) {
      state.callStatus = action.payload;
    },

    setConnectionState(state, action) {
      state.connectionState = action.payload;
    },

    setDataChannel(state, action) {
      state.dataChannel = action.payload;
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
      const {
        open_video_dialog,
        open_video_notification_dialog,
        call_queue,
        incoming,
      } = state;

      Object.assign(state, {
        ...initialState,
        open_video_dialog,
        open_video_notification_dialog,
        call_queue,
        incoming,
      });
    },

    completeReset(state, action) {
      Object.assign(state, initialState);
    },
  },
});

// Reducer
export default slice.reducer;

// ----------------------------------------------------------------------

// 🆕 WebRTC Action Creators
export const StartVideoCall = (
  toUserId,
  callType = "direct",
  conversationId = null
) => {
  return async (dispatch, getState) => {
    try {
      const state = getState();
      const fromUserId = state.auth.user_id || state.app.user?.keycloakId;

      if (!fromUserId) {
        throw new Error("User not authenticated");
      }

      console.log("🎥 Starting video call:", {
        from: fromUserId,
        to: toUserId,
        callType,
      });

      // Reset any existing call
      dispatch(slice.actions.resetVideoCallQueue());

      // Create unique room ID
      const roomID = `video_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const callData = {
        id: `call_${Date.now()}`,
        roomID: roomID,
        from: fromUserId,
        to: toUserId,
        callType: callType,
        conversationId: conversationId,
        timestamp: new Date().toISOString(),
        name: "Video Call",
        avatar: "",
        incoming: false,
      };

      dispatch(
        slice.actions.pushToVideoCallQueue({
          call: callData,
          incoming: false,
        })
      );

      dispatch(slice.actions.setCallRoom(roomID));
      dispatch(slice.actions.setCallStatus("calling"));

      // Gửi socket event
      const { socket } = await import("../../socket");
      if (socket && socket.connected) {
        socket.emit("start_video_call", {
          ...callData,
          from_name: state.app.user?.firstName || "User",
          from_avatar: state.app.user?.avatar || "",
        });
      } else {
        console.warn("Socket not connected, cannot send call notification");
      }

      return callData;
    } catch (error) {
      console.error("❌ Error starting video call:", error);
      dispatch(
        showSnackbar({
          severity: "error",
          message: error.message || "Failed to start video call",
        })
      );
      throw error;
    }
  };
};

// Existing actions với cập nhật nhỏ
export const StartDirectVideoCall = (callData) => {
  return async (dispatch) => {
    dispatch(slice.actions.resetVideoCallQueue());

    dispatch(
      slice.actions.pushToVideoCallQueue({
        call: callData,
        incoming: false,
      })
    );

    dispatch(slice.actions.setCallRoom(callData.roomID));
    dispatch(slice.actions.setCallStatus("calling"));

    // Gửi socket event
    const { socket } = await import("../../socket");
    if (socket && socket.connected) {
      socket.emit("start_video_call", callData);
    }
  };
};

export const PushToVideoCallQueue = (call) => {
  return async (dispatch) => {
    // Ensure call has required properties
    const enhancedCall = {
      ...call,
      id: call.id || `call_${Date.now()}`,
      roomID: call.roomID || `video_room_${Date.now()}`,
      timestamp: call.timestamp || new Date().toISOString(),
      callType: call.callType || "direct",
      name: call.name || "Incoming Video Call",
      avatar: call.avatar || "",
    };

    dispatch(
      slice.actions.pushToVideoCallQueue({
        call: enhancedCall,
        incoming: true,
      })
    );
  };
};

export const ResetVideoCallQueue = () => {
  return async (dispatch) => {
    dispatch(slice.actions.resetVideoCallQueue());
  };
};

export const CloseVideoNotificationDialog = () => {
  return async (dispatch) => {
    dispatch(slice.actions.closeNotificationDialog());
  };
};

export const UpdateVideoCallDialog = (state) => {
  return async (dispatch) => {
    dispatch(slice.actions.updateCallDialog({ state }));
  };
};

export const AcceptVideoCall = () => {
  return async (dispatch, getState) => {
    try {
      const currentCall = getState().videoCall.call_queue[0];
      if (currentCall) {
        // Gửi accept event
        const { socket } = await import("../../socket");
        if (socket && socket.connected) {
          socket.emit("accept_video_call", {
            roomID: currentCall.roomID,
            to: currentCall.from,
          });
        }

        dispatch(slice.actions.setCallStatus("connecting"));
        dispatch(UpdateVideoCallDialog(true));

        dispatch(
          showSnackbar({
            severity: "success",
            message: "Video call accepted",
          })
        );
      }
    } catch (error) {
      console.error("❌ Error accepting video call:", error);
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Failed to accept video call",
        })
      );
    }
  };
};

export const RejectVideoCall = () => {
  return async (dispatch, getState) => {
    const currentCall = getState().videoCall.call_queue[0];
    if (currentCall) {
      const { socket } = await import("../../socket");
      if (socket && socket.connected) {
        socket.emit("reject_video_call", {
          roomID: currentCall.roomID,
          to: currentCall.from,
        });
      }
    }
    dispatch(ResetVideoCallQueue());
  };
};

export const EndVideoCall = () => {
  return async (dispatch, getState) => {
    try {
      const state = getState().videoCall;
      const currentCall = state.call_queue[0];

      if (currentCall) {
        // Gửi end event
        const { socket } = await import("../../socket");
        if (socket && socket.connected) {
          socket.emit("end_video_call", {
            roomID: currentCall.roomID,
            to: currentCall.to || currentCall.from,
            duration: state.callDuration,
          });
        }
      }

      // Cleanup WebRTC
      if (state.peerConnection) {
        state.peerConnection.close();
      }

      if (state.localStream) {
        state.localStream.getTracks().forEach((track) => track.stop());
      }

      if (state.remoteStream) {
        state.remoteStream.getTracks().forEach((track) => track.stop());
      }

      // Reset state
      dispatch(slice.actions.completeReset());

      dispatch(
        showSnackbar({
          severity: "info",
          message: `Video call ended (${state.callDuration}s)`,
        })
      );
    } catch (error) {
      console.error("❌ Error ending video call:", error);
      dispatch(slice.actions.completeReset());
    }
  };
};

export const ToggleMuteVideo = () => {
  return async (dispatch, getState) => {
    const state = getState().videoCall;
    const newMuteState = !state.isMuted;

    dispatch(slice.actions.toggleMute());

    // Update local stream
    if (state.localStream) {
      state.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !newMuteState;
      });
    }

    // Notify other participants
    const currentCall = state.call_queue[0];
    const { socket } = await import("../../socket");
    if (socket && socket.connected && currentCall) {
      socket.emit("video_call_mute_toggled", {
        roomID: currentCall.roomID,
        isMuted: newMuteState,
      });
    }
  };
};

export const ToggleVideoOff = () => {
  return async (dispatch, getState) => {
    const state = getState().videoCall;
    const newVideoState = !state.isVideoOff;

    dispatch(slice.actions.toggleVideo());

    // Update local stream
    if (state.localStream) {
      state.localStream.getVideoTracks().forEach((track) => {
        track.enabled = !newVideoState;
      });
    }

    // Notify other participants
    const currentCall = state.call_queue[0];
    const { socket } = await import("../../socket");
    if (socket && socket.connected && currentCall) {
      socket.emit("video_call_video_toggled", {
        roomID: currentCall.roomID,
        isVideoOff: newVideoState,
      });
    }
  };
};

export const UpdateVideoCallDuration = () => {
  return async (dispatch, getState) => {
    dispatch(slice.actions.incrementCallDuration());
  };
};

// 🆕 Export all actions từ slice
export const {
  setCallActive,
  updateCallDuration,
  toggleMute,
  toggleVideo,
  pushToVideoCallQueue: slicePushToVideoCallQueue,
  setLocalStream,
  setRemoteStream,
  setPeerConnection,
  setCallRoom,
  setCallStatus,
  setConnectionState,
  setDataChannel,
  addParticipant,
  removeParticipant,
  updateParticipant,
  resetCallState,
  completeReset,
} = slice.actions;
