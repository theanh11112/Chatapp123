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

const DashboardLayout = () => {
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

  // 2️⃣ Kết nối Socket và lắng nghe realtime
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
        const msg = data.message;
        // ⚡ Nếu message.id đã tồn tại trong current_messages → bỏ qua
        const existing = conversations
          .find((c) => c.id === data.conversation_id)
          ?.messages.some((m) => m._id === msg.id);

        if (existing) return;

        // Cập nhật conversation UI qua slice
        dispatch(
          addDirectMessage({
            message: {
              id: msg.id,
              type: "msg",
              subtype: msg.type,
              message: msg.content || msg.text,
              incoming: msg.to === user_id,
              outgoing: msg.from === user_id,
              attachments: msg.attachments || [],
              time: msg.createdAt,
            },
            conversation_id: data.conversation_id,
          })
        );

        dispatch(
          updateDirectConversation({
            conversation: { _id: data.conversation_id, messages: [msg] },
            currentUserId: user_id,
          })
        );
      });

      sock.on("start_chat", (data) => {
        const existed = conversations.find((c) => c.id === data._id);
        if (existed) dispatch(updateDirectConversation({ conversation: data }));
        else dispatch(addDirectConversation({ conversation: data }));

        dispatch(SelectConversation({ room_id: data._id }));
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
        dispatch(
          updateUserPresence({
            userId,
            status: "Online",
            lastSeen: lastSeen || null,
          })
        );
      });

      sock.on("user_offline", ({ userId, lastSeen }) => {
        dispatch(
          updateUserPresence({
            userId,
            status: "Offline",
            lastSeen: lastSeen || null,
          })
        );
      });

      // Audio/Video Call
      sock.on("audio_call_notification", (data) =>
        dispatch(PushToAudioCallQueue(data))
      );
      sock.on("video_call_notification", (data) =>
        dispatch(PushToVideoCallQueue(data))
      );
    };

    setupSocket();

    return () => {
      active = false;
      const sock = getSocket();
      sock?.removeAllListeners();
    };
  }, [isReady, isLoggedIn, keycloak.token, user_id, conversations, dispatch]);

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
