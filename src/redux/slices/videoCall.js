// redux/slices/videoCall.js - FIXED VERSION
import { createSlice } from "@reduxjs/toolkit";
import { socket } from "../../socket";
import axios from "../../utils/axios";

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
        } else {
          state.open_video_dialog = true;
          state.incoming = false;
        }
      } else {
        socket.emit("user_is_busy_video_call", { ...action.payload });
      }
    },
    resetVideoCallQueue(state, action) {
      state.call_queue = [];
      state.open_video_notification_dialog = false;
      state.open_video_dialog = false;
      state.incoming = false;
      state.isCallActive = false;
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
    },
    updateCallDuration(state, action) {
      state.callDuration = action.payload;
    },
    toggleMute(state, action) {
      state.isMuted = !state.isMuted;
    },
    toggleVideo(state, action) {
      state.isVideoOff = !state.isVideoOff;
    },
  },
});

// Reducer
export default slice.reducer;

// ----------------------------------------------------------------------

// 🆕 FIX: Cập nhật StartVideoCall action creator
export const StartVideoCall = (
  toUserId,
  callType = "direct",
  conversationId = null
) => {
  return async (dispatch, getState) => {
    try {
      dispatch(slice.actions.resetVideoCallQueue());

      // 🆕 Tạo roomID và streamID duy nhất
      const roomID = `video_room_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const streamID = `video_stream_${
        getState().auth.user?.keycloakId
      }_${Date.now()}`;

      // 🆕 Tạo payload đầy đủ
      const callData = {
        from: getState().auth.user?.keycloakId,
        from_name:
          getState().auth.user?.userName ||
          getState().auth.user?.firstName ||
          "User",
        to: toUserId, // 🆕 Thêm userId người nhận
        to_name: "User", // Có thể lấy từ state nếu có
        roomID: roomID, // 🆕 Thêm roomID
        streamID: streamID, // 🆕 Thêm streamID
        callType: callType,
        conversationId: conversationId,
      };

      console.log("🎥 Starting video call with data:", callData);

      // 🆕 Gửi request với đầy đủ dữ liệu
      const response = await axios.post(
        "/call/start-video-call",
        callData, // 🆕 Gửi toàn bộ callData thay vì chỉ id
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getState().auth.token}`,
          },
        }
      );

      console.log("✅ Video call started:", response.data);

      // 🆕 Kết hợp dữ liệu từ response và local
      const callWithRoom = {
        ...response.data.data,
        roomID: roomID, // Đảm bảo có roomID
        streamID: streamID,
        from: callData.from,
        to: toUserId,
      };

      dispatch(
        slice.actions.pushToVideoCallQueue({
          call: callWithRoom,
          incoming: false,
        })
      );

      // 🆕 Gửi socket event
      socket.emit("start_video_call", callWithRoom);
    } catch (error) {
      console.error("❌ Error starting video call:", error);
      // 🆕 Xử lý lỗi - có thể hiển thị thông báo cho user
    }
  };
};

// 🆕 THÊM: Action để khởi tạo call trực tiếp (không cần API call)
export const StartDirectVideoCall = (callData) => {
  return async (dispatch, getState) => {
    dispatch(slice.actions.resetVideoCallQueue());

    dispatch(
      slice.actions.pushToVideoCallQueue({
        call: callData,
        incoming: false,
      })
    );

    // Gửi socket event
    socket.emit("start_video_call", callData);
  };
};

export const PushToVideoCallQueue = (call) => {
  return async (dispatch, getState) => {
    dispatch(slice.actions.pushToVideoCallQueue({ call, incoming: true }));
  };
};

export const ResetVideoCallQueue = () => {
  return async (dispatch, getState) => {
    dispatch(slice.actions.resetVideoCallQueue());
  };
};

export const CloseVideoNotificationDialog = () => {
  return async (dispatch, getState) => {
    dispatch(slice.actions.closeNotificationDialog());
  };
};

export const UpdateVideoCallDialog = (state) => {
  return async (dispatch, getState) => {
    dispatch(slice.actions.updateCallDialog({ state }));
  };
};

// 🆕 THÊM: Các action mới cho call management
export const AcceptVideoCall = () => {
  return async (dispatch, getState) => {
    const currentCall = getState().videoCall.call_queue[0];
    if (currentCall) {
      socket.emit("accept_video_call", {
        roomID: currentCall.roomID,
        to: currentCall.from,
      });
    }
    dispatch(UpdateVideoCallDialog(true));
  };
};

export const RejectVideoCall = () => {
  return async (dispatch, getState) => {
    const currentCall = getState().videoCall.call_queue[0];
    if (currentCall) {
      socket.emit("reject_video_call", {
        roomID: currentCall.roomID,
        to: currentCall.from,
      });
    }
    dispatch(ResetVideoCallQueue());
  };
};

export const EndVideoCall = () => {
  return async (dispatch, getState) => {
    const currentCall = getState().videoCall.call_queue[0];
    if (currentCall) {
      socket.emit("end_video_call", {
        roomID: currentCall.roomID,
        to: currentCall.to || currentCall.from,
      });
    }
    dispatch(ResetVideoCallQueue());
  };
};

export const { setCallActive, updateCallDuration, toggleMute, toggleVideo } =
  slice.actions;
