// redux/slices/audioCall.js - UPDATED VERSION
import { createSlice } from "@reduxjs/toolkit";
import { showSnackbar } from "./app";

const initialState = {
  open_audio_dialog: false,
  open_audio_notification_dialog: false,
  call_queue: [],
  incoming: false,
  isCallActive: false,
  callType: null,
  participants: [],
  callDuration: 0,
  isMuted: false,
  isSpeakerOn: true,
  // WebRTC compatibility states
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  callRoom: null,
  callStatus: "idle",
  connectionState: "disconnected",
  // Thêm trường mới để lưu call data
  currentCallData: null,
};

const slice = createSlice({
  name: "audioCall",
  initialState,
  reducers: {
    pushToAudioCallQueue(state, action) {
      console.log("🔔 pushToAudioCallQueue:", action.payload);

      // Always reset first to avoid conflicts
      state.call_queue = [];
      state.open_audio_notification_dialog = false;
      state.open_audio_dialog = false;

      const callData = action.payload.call;

      // Ensure call has required properties
      const enhancedCall = {
        id: callData.id || callData.callId || `call_${Date.now()}`,
        callId: callData.callId || callData.id || `call_${Date.now()}`,
        roomID: callData.roomID || `audio_room_${Date.now()}`,
        from: callData.from || callData.fromUser?.keycloakId,
        to: callData.to || callData.toUser?.keycloakId,
        fromUser: callData.fromUser || {
          keycloakId: callData.from,
          username: "Unknown",
        },
        toUser: callData.toUser || {
          keycloakId: callData.to,
          username: "Unknown",
        },
        type: callData.type || "audio",
        timestamp: callData.timestamp || new Date().toISOString(),
        incoming: action.payload.incoming,
        status: "ringing",
      };

      console.log("🔔 Enhanced call data:", enhancedCall);

      state.call_queue = [enhancedCall];
      state.currentCallData = enhancedCall;

      if (action.payload.incoming) {
        state.open_audio_notification_dialog = true;
        state.incoming = true;
        state.callStatus = "ringing";
      } else {
        state.open_audio_dialog = true;
        state.incoming = false;
        state.callStatus = "calling";
      }
    },

    resetAudioCallQueue(state, action) {
      console.log("🔄 resetAudioCallQueue");
      Object.assign(state, initialState);
    },

    closeNotificationDialog(state, action) {
      state.open_audio_notification_dialog = false;
    },

    updateCallDialog(state, action) {
      state.open_audio_dialog = !!action.payload.state;
      state.open_audio_notification_dialog = false;
    },

    setCallActive(state, action) {
      state.isCallActive = action.payload;
      state.callStatus = action.payload ? "connected" : "ended";
    },

    updateCallDuration(state, action) {
      state.callDuration = action.payload;
    },

    toggleMute(state, action) {
      state.isMuted = !state.isMuted;
    },

    toggleSpeaker(state, action) {
      state.isSpeakerOn = !state.isSpeakerOn;
    },

    updateCallStatus(state, action) {
      state.callStatus = action.payload;
    },

    updateCurrentCallData(state, action) {
      state.currentCallData = action.payload;
    },

    resetCallState(state, action) {
      Object.assign(state, initialState);
    },

    // THÊM REDUCER MỚI: updateCallData
    updateCallData(state, action) {
      const { callId, roomID, status } = action.payload;

      if (state.call_queue.length > 0) {
        const currentCall = state.call_queue[0];

        // Chỉ update nếu roomID khớp
        if (roomID && currentCall.roomID !== roomID) {
          console.warn("⚠️ updateCallData: RoomID mismatch", {
            currentRoomID: currentCall.roomID,
            newRoomID: roomID,
          });
          return;
        }

        const updatedCall = {
          ...currentCall,
          id: callId || currentCall.id,
          callId: callId || currentCall.callId,
          roomID: roomID || currentCall.roomID,
          status: status || currentCall.status,
        };

        console.log("📝 updateCallData:", updatedCall);
        state.call_queue[0] = updatedCall;
        state.currentCallData = updatedCall;

        // Cập nhật callStatus nếu có
        if (status) {
          state.callStatus = status;
        }
      }
    },
  },
});

export default slice.reducer;

// ----------------------------------------------------------------------

export const {
  pushToAudioCallQueue,
  resetAudioCallQueue,
  closeNotificationDialog,
  updateCallDialog,
  setCallActive,
  updateCallDuration,
  toggleMute,
  toggleSpeaker,
  updateCallStatus,
  updateCurrentCallData,
  resetCallState,
  updateCallData, // THÊM DÒNG NÀY
} = slice.actions;

// ==================== ACTION CREATORS ====================

export const StartAudioCall = (
  toUserId,
  callType = "direct",
  roomID = null
) => {
  return async (dispatch, getState) => {
    try {
      const state = getState();
      const fromUserId = state.auth.user_id || state.auth.user?.keycloakId;

      if (!fromUserId) {
        throw new Error("User not authenticated");
      }

      console.log("📞 Starting audio call:", {
        from: fromUserId,
        to: toUserId,
        callType,
      });

      // Reset any existing call first
      dispatch(resetAudioCallQueue());

      const finalRoomID =
        roomID ||
        `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // KHÔNG tạo callId ở frontend, để backend tự tạo
      const callData = {
        id: `temp_${Date.now()}`, // Temporary ID for frontend only
        roomID: finalRoomID,
        from: fromUserId,
        to: toUserId,
        callType: callType,
        type: "audio",
        timestamp: new Date().toISOString(),
        fromUser: state.auth.user,
        incoming: false,
      };

      console.log("📞 Dispatching call data:", callData);

      dispatch(
        pushToAudioCallQueue({
          call: callData,
          incoming: false,
        })
      );

      // Gửi socket event - CHỈ gửi to và roomID
      import("../../socket")
        .then(({ getSocket }) => {
          const socket = getSocket();
          if (socket && socket.connected) {
            socket.emit("start_audio_call", {
              to: toUserId,
              roomID: finalRoomID,
            });
            console.log("📞 Socket event sent: start_audio_call");
          } else {
            console.warn(
              "⚠️ Socket not connected, cannot send start_audio_call"
            );
          }
        })
        .catch(console.error);

      return callData;
    } catch (error) {
      console.error("❌ Start audio call error:", error);
      dispatch(
        showSnackbar({
          severity: "error",
          message: error.message || "Failed to start audio call",
        })
      );
      throw error;
    }
  };
};

export const AcceptAudioCall = () => {
  return async (dispatch, getState) => {
    try {
      const currentCall = getState().audioCall.call_queue[0];
      if (!currentCall) {
        throw new Error("No active call");
      }

      console.log("✅ Accepting audio call:", {
        roomID: currentCall.roomID,
        callId: currentCall.callId,
      });

      // Cập nhật trạng thái call thành "ongoing" trong Redux
      if (currentCall.callId && currentCall.callId.startsWith("temp_")) {
        // Nếu vẫn là temp ID, chưa cập nhật
        console.log("⚠️ Still using temp callId, waiting for server response");
      } else {
        // Đã có callId thật từ server, cập nhật status
        dispatch(
          updateCallData({
            callId: currentCall.callId,
            roomID: currentCall.roomID,
            status: "ongoing",
          })
        );
      }

      // Update state
      dispatch(closeNotificationDialog());
      dispatch(updateCallDialog({ state: true }));
      dispatch(setCallActive(true));

      // Send accept via socket - CHỈ gửi roomID
      import("../../socket")
        .then(({ getSocket }) => {
          const socket = getSocket();
          if (socket && socket.connected) {
            socket.emit("audio_call_accepted", {
              roomID: currentCall.roomID,
              // KHÔNG gửi callId
            });
            console.log(
              "✅ Socket event sent: audio_call_accepted (roomID only)"
            );
          } else {
            console.warn(
              "⚠️ Socket not connected, cannot send audio_call_accepted"
            );
          }
        })
        .catch(console.error);

      dispatch(
        showSnackbar({
          severity: "success",
          message: "Audio call accepted",
        })
      );
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
    const currentCall = getState().audioCall.call_queue[0];

    if (currentCall) {
      // Send reject via socket
      import("../../socket")
        .then(({ getSocket }) => {
          const socket = getSocket();
          if (socket && socket.connected) {
            socket.emit("audio_call_declined", {
              callId: currentCall.callId || currentCall.id,
              roomID: currentCall.roomID,
            });
            console.log("❌ Socket event sent: audio_call_declined");
          } else {
            console.warn(
              "⚠️ Socket not connected, cannot send audio_call_declined"
            );
          }
        })
        .catch(console.error);
    }

    dispatch(resetAudioCallQueue());
  };
};

export const EndAudioCall = () => {
  return async (dispatch, getState) => {
    try {
      const state = getState().audioCall;
      const currentCall = state.call_queue[0];

      if (currentCall) {
        console.log("📴 Ending audio call:", {
          roomID: currentCall.roomID,
          callId: currentCall.callId,
          duration: state.callDuration,
        });

        // Gửi socket event - CHỈ gửi roomID nếu callId không phải ObjectId
        import("../../socket")
          .then(({ getSocket }) => {
            const socket = getSocket();
            if (socket && socket.connected) {
              // Kiểm tra xem callId có phải ObjectId không
              const isValidObjectId = (id) =>
                id &&
                typeof id === "string" &&
                id.length === 24 &&
                /^[0-9a-fA-F]{24}$/.test(id);

              const callId = currentCall.callId || currentCall.id;

              if (isValidObjectId(callId)) {
                // Nếu là ObjectId hợp lệ, gửi cả callId và roomID
                socket.emit("end_call", {
                  roomID: currentCall.roomID,
                  callId: callId,
                });
                console.log("📴 Socket event sent: end_call (with callId)");
              } else if (callId.startsWith("temp_")) {
                // Nếu là temp ID, chỉ gửi roomID
                socket.emit("end_call", {
                  roomID: currentCall.roomID,
                });
                console.log(
                  "📴 Socket event sent: end_call (roomID only - temp ID)"
                );
              } else {
                // Default: gửi cả hai
                socket.emit("end_call", {
                  roomID: currentCall.roomID,
                  callId: callId,
                });
                console.log("📴 Socket event sent: end_call (with both)");
              }
            } else {
              console.warn("⚠️ Socket not connected, cannot send end_call");
            }
          })
          .catch(console.error);
      }

      // Reset state
      dispatch(resetAudioCallQueue());

      dispatch(
        showSnackbar({
          severity: "info",
          message: `Audio call ended (${state.callDuration}s)`,
        })
      );
    } catch (error) {
      console.error("❌ End audio call error:", error);
      dispatch(resetAudioCallQueue());
    }
  };
};

export const ToggleMuteAudio = () => {
  return async (dispatch, getState) => {
    const state = getState().audioCall;
    dispatch(toggleMute());

    const currentCall = state.call_queue[0];
    if (currentCall) {
      import("../../socket")
        .then(({ getSocket }) => {
          const socket = getSocket();
          if (socket && socket.connected) {
            socket.emit("toggle_audio_mute", {
              roomID: currentCall.roomID,
              isMuted: !state.isMuted,
            });
          }
        })
        .catch(console.error);
    }
  };
};

export const ToggleSpeakerAudio = () => {
  return async (dispatch) => {
    dispatch(toggleSpeaker());
  };
};

// THÊM ACTION MỚI: UpdateCallData (wrapper cho updateCallData)
export const UpdateCallData = (callData) => {
  return async (dispatch) => {
    console.log("📝 UpdateCallData action:", callData);
    dispatch(updateCallData(callData));
  };
};

// Compatibility exports - FIXED
export const PushToAudioCallQueue = (call) => {
  return async (dispatch) => {
    console.log("📞 PushToAudioCallQueue received:", call);

    const enhancedCall = {
      ...call,
      id: call.id || call.callId || `call_${Date.now()}`,
      callId: call.callId || call.id || `call_${Date.now()}`,
      roomID: call.roomID || `audio_room_${Date.now()}`,
      from: call.from || call.fromUser?.keycloakId,
      fromUser: call.fromUser || {
        keycloakId: call.from,
        username: call.fromUser?.username || "Unknown",
      },
      type: call.type || "audio",
      timestamp: call.timestamp || new Date().toISOString(),
      incoming: true,
      status: "ringing",
    };

    console.log("📞 Dispatching enhanced call:", enhancedCall);

    dispatch(
      pushToAudioCallQueue({
        call: enhancedCall,
        incoming: true,
      })
    );
  };
};

export const CloseAudioNotificationDialog = () => {
  return async (dispatch) => {
    dispatch(closeNotificationDialog());
  };
};

export const UpdateAudioCallDialog = (state) => {
  return async (dispatch) => {
    dispatch(updateCallDialog({ state }));
  };
};

// THÊM ACTION MỚI: Handle incoming audio call started from server
export const HandleAudioCallStarted = (data) => {
  return async (dispatch, getState) => {
    try {
      console.log("🎯 HandleAudioCallStarted:", data);

      const state = getState().audioCall;
      const currentCall = state.call_queue[0];

      if (!currentCall) {
        console.warn("⚠️ No current call to update");
        return;
      }

      // Kiểm tra roomID có khớp không
      if (data.roomID !== currentCall.roomID) {
        console.warn("⚠️ RoomID mismatch", {
          currentRoomID: currentCall.roomID,
          serverRoomID: data.roomID,
        });
        return;
      }

      // Cập nhật callId từ server
      if (data.callId && data.callId !== currentCall.callId) {
        console.log("🔄 Updating callId from server:", {
          oldCallId: currentCall.callId,
          newCallId: data.callId,
        });

        dispatch(
          updateCallData({
            callId: data.callId,
            roomID: data.roomID,
            status: "ringing",
          })
        );

        dispatch(
          showSnackbar({
            severity: "info",
            message: "Call connection established",
          })
        );
      }
    } catch (error) {
      console.error("❌ HandleAudioCallStarted error:", error);
    }
  };
};

// THÊM ACTION MỚI: Handle call accepted from server
export const HandleCallAccepted = (data) => {
  return async (dispatch, getState) => {
    try {
      console.log("🎯 HandleCallAccepted:", data);

      const state = getState().audioCall;
      const currentCall = state.call_queue[0];

      if (!currentCall) {
        console.warn("⚠️ No current call to update");
        return;
      }

      // Kiểm tra roomID có khớp không
      if (data.roomID !== currentCall.roomID) {
        console.warn("⚠️ RoomID mismatch in call accepted", {
          currentRoomID: currentCall.roomID,
          serverRoomID: data.roomID,
        });
        return;
      }

      // Cập nhật trạng thái call thành ongoing
      dispatch(
        updateCallData({
          callId: data.callId || currentCall.callId,
          roomID: data.roomID,
          status: "ongoing",
        })
      );

      // Nếu là người gọi, cập nhật isCallActive
      if (!state.incoming) {
        dispatch(setCallActive(true));
      }

      dispatch(
        showSnackbar({
          severity: "success",
          message: `Call accepted by ${data.acceptedBy || "receiver"}`,
        })
      );
    } catch (error) {
      console.error("❌ HandleCallAccepted error:", error);
    }
  };
};
