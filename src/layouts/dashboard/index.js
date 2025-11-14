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
  AddDirectConversation,
  AddDirectMessage,
  UpdateDirectConversation,
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

  const { user_id, role, isLoggedIn } = useSelector((state) => state.auth);
  const { conversations, current_conversation } = useSelector(
    (state) => state.conversation.direct_chat
  );
  const { open_audio_notification_dialog, open_audio_dialog } = useSelector(
    (state) => state.audioCall
  );
  const { open_video_notification_dialog, open_video_dialog } = useSelector(
    (state) => state.videoCall
  );

  // Đồng bộ Keycloak vào Redux
  useEffect(() => {
    if (!initialized || !keycloak.authenticated) return;

    const tokenParsed = keycloak.tokenParsed || {};
    const realmRoles = tokenParsed.realm_access?.roles || [];
    const clientRoles = Object.values(tokenParsed.resource_access || {})
      .flatMap((client) => client.roles || []);
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
        user_id: tokenParsed.sub,
        role: userRole,
        token: keycloak.token,
      })
    );

    setIsReady(true);
  }, [initialized, keycloak, dispatch]);

  // Setup socket realtime
  useEffect(() => {
    if (!isReady || !isLoggedIn || !keycloak.token) return;

    let active = true;

    const setupSocket = async () => {
      const sock = await connectSocket(keycloak.token);
      if (!active) return;

      console.log("🔗 Dashboard socket connected:", sock.id);
      setSocketReady(true);

      // Listener socket
      sock.on("audio_call_notification", (data) =>
        dispatch(PushToAudioCallQueue(data))
      );
      sock.on("video_call_notification", (data) =>
        dispatch(PushToVideoCallQueue(data))
      );
      sock.on("new_message", (data) => {
        const message = data.message;
        if (current_conversation?.id === data.conversation_id) {
          dispatch(
            AddDirectMessage({
              id: message._id,
              type: "msg",
              subtype: message.type,
              message: message.text,
              incoming: message.to === user_id,
              outgoing: message.from === user_id,
            })
          );
        }
      });
      sock.on("start_chat", (data) => {
        const existing = conversations.find((c) => c?.id === data._id);
        if (existing)
          dispatch(UpdateDirectConversation({ conversation: data }));
        else dispatch(AddDirectConversation({ conversation: data }));
        dispatch(SelectConversation({ room_id: data._id }));
      });
      sock.on("new_friend_request", () =>
        dispatch(
          showSnackbar({
            severity: "success",
            message: "📩 New friend request received!",
          })
        )
      );
    };

    setupSocket();

    return () => {
      active = false;
      const sock = getSocket();
      if (!sock) return;
      sock.removeAllListeners();
    };
  }, [
    isReady,
    isLoggedIn,
    user_id,
    current_conversation,
    conversations,
    dispatch,
    keycloak.token,
  ]);

  if (!isReady || !isLoggedIn || !socketReady) return <LoadingScreen />;

  return (
    <Stack direction="row">
      <SideBar role={role} />
      <Outlet />

      {open_audio_notification_dialog && (
        <AudioCallNotification open={open_audio_notification_dialog} />
      )}
      {open_audio_dialog && (
        <AudioCallDialog
          open={open_audio_dialog}
          handleClose={() => dispatch(UpdateAudioCallDialog({ state: false }))}
        />
      )}
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
