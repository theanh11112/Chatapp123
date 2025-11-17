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

const DashboardLayout = ({ showChat = false, children }) => {
  const dispatch = useDispatch();
  const { keycloak, initialized } = useKeycloak();

  const [isReady, setIsReady] = useState(false);
  const [socketReady, setSocketReady] = useState(false);

  const { user_id, role, isLoggedIn } = useSelector((s) => s.auth);
  const { conversations, current_conversation } = useSelector(
    (s) => s.conversation.direct_chat
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

  // 2️⃣ Kết nối Socket và lắng nghe realtime - ĐÃ SỬA
  useEffect(() => {
    if (!isReady || !isLoggedIn || !keycloak.token) return;
    let active = true;

    const setupSocket = async () => {
      const sock = await connectSocket(keycloak.token);
      if (!active) return;

      console.log("🔗 Socket connected:", sock.id);
      setSocketReady(true);

      // Chat events
      sock.on("new_message", (data) => {
        console.log("🔌 Socket: new_message received", data);

        const msg = data.message;

        // ⚡ VALIDATE: Kiểm tra dữ liệu message
        if (!msg || !data.conversation_id) {
          console.warn("🚨 Socket: Invalid message data", data);
          return;
        }
        // 🔥 QUAN TRỌNG: BỎ QUA TIN NHẮN TỪ CHÍNH MÌNH
        if (msg.from === user_id) {
          console.log("🔄 Ignoring own message from socket");
          return;
        }

        // ⚡ Nếu message.id đã tồn tại trong current_messages → bỏ qua
        const existing = conversations
          .find((c) => c.id === data.conversation_id)
          ?.messages?.some((m) => m._id === msg.id);

        if (existing) {
          console.log("⚠️ Message already exists, skipping");
          return;
        }

        // Cập nhật conversation UI qua slice
        dispatch(
          addDirectMessage({
            message: {
              id: msg.id,
              type: "msg",
              subtype: msg.type,
              message: msg.content || msg.text,
              incoming: true,
              outgoing: false,
              attachments: msg.attachments || [],
              time: msg.createdAt,
            },
            conversation_id: data.conversation_id,
            currentUserId: user_id,
          })
        );

        // ⚡ QUAN TRỌNG: Không gọi updateDirectConversation với dữ liệu không đầy đủ
        // Vì nó sẽ reset current_conversation
        console.log(
          "✅ Message added to Redux, skipping conversation update to prevent reset"
        );
      });

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

        dispatch(SelectConversation({ room_id: data._id }));
      });

      // ⚡ THÊM: Lắng nghe sự kiện update_conversation và validate
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
          eventName !== "new_message" &&
          eventName !== "user_online" &&
          eventName !== "user_offline"
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
  }, [isReady, isLoggedIn, keycloak.token, user_id, conversations, dispatch]);

  // Debug current_conversation changes
  useEffect(() => {
    console.log("🔍 DashboardLayout - current_conversation:", {
      id: current_conversation?.id,
      user_id: current_conversation?.user_id,
      name: current_conversation?.name,
      messages_count: current_conversation?.messages?.length,
    });
  }, [current_conversation]);

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
