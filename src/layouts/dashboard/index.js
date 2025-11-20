import React, { useEffect, useState } from "react";
import { Stack } from "@mui/material";
import { Outlet } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useKeycloak } from "@react-keycloak/web";

import SideBar from "./SideNav";
import LoadingScreen from "../../components/LoadingScreen";

import { setKeycloakUser } from "../../redux/slices/auth";
import { connectSocket, getSocket } from "../../socket";

import {
  addDirectConversation,
  addDirectMessage,
  updateDirectConversation,
  updateUserPresence,
  addGroupMessage, // 🆕 THÊM
  updateGroupRoom, // 🆕 THÊM
} from "../../redux/slices/conversation";

import { SelectConversation, showSnackbar } from "../../redux/slices/app";

import {
  PushToAudioCallQueue,
  UpdateAudioCallDialog,
} from "../../redux/slices/audioCall";
import AudioCallNotification from "../../sections/dashboard/Audio/CallNotification";
import AudioCallDialog from "../../sections/dashboard/Audio/CallDialog";

import {
  PushToVideoCallQueue,
  UpdateVideoCallDialog,
} from "../../redux/slices/videoCall";
import VideoCallNotification from "../../sections/dashboard/video/CallNotification";
import VideoCallDialog from "../../sections/dashboard/video/CallDialog";

const formatMessageTime = (ts) =>
  ts
    ? new Date(ts).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

const DashboardLayout = ({ showChat = false, children }) => {
  const dispatch = useDispatch();
  const { keycloak, initialized } = useKeycloak();

  const [isReady, setIsReady] = useState(false);
  const [socketReady, setSocketReady] = useState(false);

  const { user_id, role, isLoggedIn } = useSelector((s) => s.auth);
  const { conversations, current_conversation } = useSelector(
    (s) => s.conversation.direct_chat
  );
  const { rooms, current_room } = useSelector(
    // 🆕 THÊM: Lấy group rooms
    (s) => s.conversation.group_chat
  );

  const { open_audio_notification_dialog, open_audio_dialog } = useSelector(
    (s) => s.audioCall
  );

  const { open_video_notification_dialog, open_video_dialog } = useSelector(
    (s) => s.videoCall
  );

  // 1️⃣ Đồng bộ Keycloak vào Redux
  useEffect(() => {
    if (!initialized || !keycloak.authenticated) return;

    const tokenData = keycloak.tokenParsed || {};
    const realmRoles = tokenData.realm_access?.roles || [];
    const clientRoles = Object.values(tokenData.resource_access || {}).flatMap(
      (c) => c.roles || []
    );

    const allRoles = [...new Set([...realmRoles, ...clientRoles])];
    const filteredRoles = allRoles.filter(
      (r) =>
        ![
          "offline_access",
          "uma_authorization",
          "default-roles-chat-app",
          "manage-account",
          "manage-account-links",
          "view-profile",
        ].includes(r)
    );

    const userRole =
      filteredRoles.find((r) =>
        ["admin", "moderator", "bot", "guest"].includes(r)
      ) || "user";

    dispatch(
      setKeycloakUser({
        user_id: tokenData.sub,
        role: userRole,
        token: keycloak.token,
      })
    );

    setIsReady(true);
  }, [initialized, keycloak, dispatch]);

  // 2️⃣ Kết nối Socket và lắng nghe realtime - ĐÃ SỬA HỖ TRỢ GROUP
  useEffect(() => {
    if (!isReady || !isLoggedIn || !keycloak.token) return;
    let active = true;

    const setupSocket = async () => {
      const sock = await connectSocket(keycloak.token);
      if (!active) return;

      console.log("🔗 Socket connected:", sock.id);
      setSocketReady(true);

      // ==================== DIRECT CHAT EVENTS ====================
      // Trong DashboardLayout.js - Sửa phần socket listener
      sock.on("new_group_message", (data) => {
        console.log("🔌 Socket: new_group_message received", {
          room_id: data.roomId,
          message_id: data.message?.id,
          sender_id: data.message?.sender?.keycloakId,
          current_user_id: user_id,
        });

        const msg = data.message;

        // 🔥 QUAN TRỌNG: BỎ QUA TIN NHẮN TỪ CHÍNH MÌNH
        if (msg.sender?.keycloakId === user_id) {
          console.log(
            "🔄 Ignoring own group message from socket - already handled by optimistic update"
          );
          return;
        }

        const isOutgoing = msg.sender?.keycloakId === user_id;

        console.log("🔍 Message direction check:", {
          message_id: msg.id,
          sender_id: msg.sender?.keycloakId,
          current_user_id: user_id,
          isOutgoing,
          should_be_incoming: !isOutgoing,
        });

        // 🆕 Dispatch message từ người khác
        dispatch(
          addGroupMessage({
            room_id: data.roomId,
            message: {
              _id: msg.id, // 🆕 MongoDB _id từ backend
              id: msg.id, // 🆕 Giữ nguyên id
              content: msg.content,
              type: msg.type,
              subtype: msg.type,
              sender: msg.sender,
              createdAt: msg.createdAt,
              time: formatMessageTime(msg.createdAt),
              incoming: true, // 🆕 Luôn là incoming từ người khác
              outgoing: false,
            },
          })
        );
      });

      // ==================== GROUP CHAT EVENTS ====================
      // Trong DashboardLayout.js - SỬA LẠI HOÀN TOÀN PHẦN new_group_message

      // XÓA 2 LISTENER CŨ VÀ THAY THẾ BẰNG 1 LISTENER DUY NHẤT
      sock.on("new_group_message", (data) => {
        console.log("🔌 Socket: new_group_message received - FULL DATA:", data);

        // 🆕 XỬ LÝ DATA STRUCTURE KHÁC NHAU
        const roomId = data.roomId || data.room_id;
        const msg = data.message;

        console.log("🔍 Parsed data:", {
          roomId,
          message_id: msg?.id,
          sender_id: msg?.sender?.keycloakId,
          current_user_id: user_id,
          data_structure: data.roomId
            ? "roomId_structure"
            : "room_id_structure",
        });

        // 🔥 VALIDATE DATA
        if (!msg || !roomId) {
          console.warn("🚨 Socket: Invalid group message data", data);
          return;
        }

        // 🔥 QUAN TRỌNG: BỎ QUA TIN NHẮN TỪ CHÍNH MÌNH
        if (msg.sender?.keycloakId === user_id) {
          console.log("🔄 Ignoring own group message from socket");
          return;
        }

        // 🆕 XÁC ĐỊNH ĐÚNG MESSAGE DIRECTION
        const isOutgoing = msg.sender?.keycloakId === user_id;

        console.log("🔍 Message direction check:", {
          message_id: msg.id,
          sender_id: msg.sender?.keycloakId,
          current_user_id: user_id,
          isOutgoing,
          should_be_incoming: !isOutgoing,
        });

        // 🆕 CHUẨN BỊ MESSAGE DATA VỚI FALLBACKS
        const messageData = {
          _id: msg._id || msg.id,
          id: msg.id || msg._id,
          content: msg.content,
          message: msg.content, // 🆕 THÊM field message
          type: msg.type || "text",
          subtype: msg.type || "text",
          sender: {
            keycloakId: msg.sender?.keycloakId,
            username: msg.sender?.username || "Unknown",
            ...msg.sender,
          },
          createdAt: msg.createdAt,
          time: formatMessageTime(msg.createdAt),
          incoming: !isOutgoing, // 🆕 Luôn là incoming từ người khác
          outgoing: isOutgoing,
        };

        console.log("✅ Prepared message data for dispatch:", {
          room_id: roomId,
          message_id: messageData.id,
          content: messageData.content,
          sender: messageData.sender.username,
          incoming: messageData.incoming,
        });

        // 🆕 Dispatch message từ người khác
        dispatch(
          addGroupMessage({
            room_id: roomId,
            message: messageData,
          })
        );
      });

      // 🆕 XÓA LISTENER THỨ 2 HOÀN TOÀN

      sock.on("start_chat", (data) => {
        console.log("🔌 Socket: start_chat received", {
          conversation_id: data._id,
          has_participants: !!data.participants,
          participants_count: data.participants?.length,
        });

        // ⚡ VALIDATE: Kiểm tra conversation có participants hợp lệ
        if (!data.participants || data.participants.length === 0) {
          console.warn("🚨 Socket: Conversation has no participants", data);
          return;
        }

        const existed = conversations.find((c) => c.id === data._id);
        if (existed) {
          console.log("🔄 Updating existing conversation");
          dispatch(
            updateDirectConversation({
              conversation: data,
              currentUserId: user_id,
            })
          );
        } else {
          console.log("➕ Adding new conversation");
          dispatch(
            addDirectConversation({
              conversation: data,
              currentUserId: user_id,
            })
          );
        }

        dispatch(
          SelectConversation({ room_id: data._id, chat_type: "individual" })
        );
      });

      sock.on("join_conversation", ({ room_id, chat_type }) => {
        console.log("🔌 Socket: join_conversation", { room_id, chat_type });

        if (chat_type === "group" && room_id) {
          sock.emit("join_group_room", { roomId: room_id });
        }
      });

      if (current_room?.id) {
        console.log("🔗 Auto-joining current room:", current_room.id);
        sock.emit("join_group_room", { roomId: current_room.id });
      }

      // 🆕 THÊM: Xử lý group room updates
      sock.on("update_group_room", (room) => {
        console.log("🔌 Socket: update_group_room received", {
          room_id: room._id,
          name: room.name,
          members_count: room.members?.length,
        });

        // ⚡ VALIDATE: Kiểm tra room data
        if (!room.members || room.members.length === 0) {
          console.warn("🚨 Socket: Room has no members", room);
          return;
        }

        console.log("✅ Valid group room, updating Redux");
        dispatch(
          updateGroupRoom({
            room,
          })
        );
      });

      sock.on("update_conversation", (conversation) => {
        console.log("🔌 Socket: update_conversation received", {
          conversation_id: conversation._id,
          has_participants: !!conversation.participants,
          participants: conversation.participants,
        });

        // ⚡ VALIDATE: Chỉ update nếu có participants hợp lệ
        if (
          !conversation.participants ||
          conversation.participants.length === 0
        ) {
          console.warn(
            "🚨 Socket: Invalid conversation data - no participants",
            conversation
          );
          return;
        }

        const hasValidUser = conversation.participants.some(
          (p) => p.keycloakId
        );
        if (!hasValidUser) {
          console.warn(
            "🚨 Socket: Conversation has no valid user_id",
            conversation
          );
          return;
        }

        console.log("✅ Valid conversation, updating Redux");
        dispatch(
          updateDirectConversation({
            conversation,
            currentUserId: user_id,
          })
        );
      });

      sock.on("new_friend_request", () =>
        dispatch(
          showSnackbar({
            severity: "success",
            message: "📩 You received a new friend request!",
          })
        )
      );

      // Multi-device Presence
      sock.on("user_online", ({ userId, lastSeen }) => {
        console.log("👤 Socket: user_online", { userId, lastSeen });
        dispatch(
          updateUserPresence({
            userId,
            status: "Online",
            lastSeen: lastSeen || null,
          })
        );
      });

      sock.on("user_offline", ({ userId, lastSeen }) => {
        console.log("👤 Socket: user_offline", { userId, lastSeen });
        dispatch(
          updateUserPresence({
            userId,
            status: "Offline",
            lastSeen: lastSeen || null,
          })
        );
      });

      // Audio/Video Call
      sock.on("audio_call_notification", (data) => {
        console.log("📞 Socket: audio_call_notification", data);
        dispatch(PushToAudioCallQueue(data));
      });

      sock.on("video_call_notification", (data) => {
        console.log("🎥 Socket: video_call_notification", data);
        dispatch(PushToVideoCallQueue(data));
      });

      // Debug: Log tất cả socket events để theo dõi
      sock.onAny((eventName, ...args) => {
        if (
          ![
            "new_message",
            "new_group_message", // 🆕 THÊM
            "user_online",
            "user_offline",
          ].includes(eventName)
        ) {
          console.log("🔌 Socket event:", eventName, args);
        }
      });
    };

    setupSocket();

    return () => {
      active = false;
      const sock = getSocket();
      if (sock) {
        console.log("🔌 Cleaning up socket listeners");
        sock.removeAllListeners();
      }
    };
  }, [
    isReady,
    isLoggedIn,
    keycloak.token,
    user_id,
    conversations,
    rooms,
    dispatch,
  ]); // 🆕 THÊM rooms

  const { room_id, chat_type } = useSelector((state) => state.app);

  useEffect(() => {
    const sock = getSocket();
    if (!sock || !room_id || !chat_type) return;

    console.log("🔄 App state changed - Auto joining conversation:", {
      room_id,
      chat_type,
    });

    // TỰ ĐỘNG EMIT JOIN_CONVERSATION KHI STATE THAY ĐỔI
    sock.emit("leave_group_room", { roomId: room_id });
    sock.emit("join_group_room", { roomId: room_id });
  }, [room_id, chat_type]); // Theo dõi state.app

  // 🆕 THÊM: Debug cả direct và group state
  useEffect(() => {
    console.log("🔍 DashboardLayout - current state:", {
      direct_conversation: {
        id: current_conversation?.id,
        user_id: current_conversation?.user_id,
        name: current_conversation?.name,
        messages_count: current_conversation?.messages?.length,
      },
      group_room: {
        id: current_room?.id,
        name: current_room?.name,
        members_count: current_room?.membersCount,
        messages_count: current_room?.messages?.length,
      },
      conversations_count: conversations.length,
      rooms_count: rooms.length,
    });
  }, [current_conversation, current_room, conversations, rooms]);

  // Trong DashboardLayout hoặc component chính - thêm socket stability

  if (!isReady || !isLoggedIn || !socketReady) return <LoadingScreen />;

  return (
    <Stack direction="row">
      <SideBar role={role} />
      <Outlet />

      {/* Audio Call */}
      {open_audio_notification_dialog && (
        <AudioCallNotification open={open_audio_notification_dialog} />
      )}
      {open_audio_dialog && (
        <AudioCallDialog
          open={open_audio_dialog}
          handleClose={() => dispatch(UpdateAudioCallDialog({ state: false }))}
        />
      )}

      {/* Video Call */}
      {open_video_notification_dialog && (
        <VideoCallNotification open={open_video_notification_dialog} />
      )}
      {open_video_dialog && (
        <VideoCallDialog
          open={open_video_dialog}
          handleClose={() => dispatch(UpdateVideoCallDialog({ state: false }))}
        />
      )}
    </Stack>
  );
};

export default DashboardLayout;
