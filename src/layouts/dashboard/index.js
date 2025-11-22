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
  addGroupMessage,
  updateGroupRoom,
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
  const { rooms, current_room } = useSelector((s) => s.conversation.group_chat);

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

  // 2️⃣ Kết nối Socket và lắng nghe realtime - ĐÃ THÊM DIRECT MESSAGE LISTENERS
  useEffect(() => {
    if (!isReady || !isLoggedIn || !keycloak.token) return;
    let active = true;

    const setupSocket = async () => {
      const sock = await connectSocket(keycloak.token);
      if (!active) return;

      console.log("🔗 Socket connected:", sock.id);
      setSocketReady(true);

      // ==================== DIRECT CHAT EVENTS ====================
      // 🆕 THÊM: Listener cho direct messages
      sock.on("text_message", (data) => {
        console.log("🔌 Socket: text_message received - DIRECT CHAT:", data);

        // VALIDATE DATA
        if (!data || !data.conversation_id) {
          console.warn("🚨 Socket: Invalid direct message data", data);
          return;
        }

        const isOwnMessage = data.from === user_id;
        const isReplyMessage = data.type === "reply";

        console.log("🔍 Processing direct message:", {
          conversation_id: data.conversation_id,
          message_id: data._id || data.id,
          from: data.from,
          to: data.to,
          isOwnMessage,
          isReplyMessage,
        });

        // 🆕 XỬ LÝ replyTo.sender
        let processedReplyTo = data.replyTo;
        if (processedReplyTo && typeof processedReplyTo.sender === "string") {
          processedReplyTo = {
            ...processedReplyTo,
            sender: {
              keycloakId: processedReplyTo.sender,
              username: "Unknown",
            },
          };
        }

        const messageData = {
          _id: data._id || data.id,
          id: data.id || data._id,
          message: data.message || data.content,
          content: data.message || data.content,
          type: "msg",
          subtype: isReplyMessage ? "reply" : data.type || "text",
          incoming: !isOwnMessage,
          outgoing: isOwnMessage,
          time: data.time || formatMessageTime(data.createdAt || new Date()),
          createdAt: data.createdAt || new Date(),
          attachments: data.attachments || [],
          sender: data.sender || {
            keycloakId: data.from,
            username: data.sender?.username || "Unknown",
          },
          replyTo: processedReplyTo,
          isOptimistic: false,
          tempId: data.tempId || data.messageId,
        };

        console.log("✅ Prepared DIRECT message data for dispatch:", {
          conversation_id: data.conversation_id,
          message_id: messageData.id,
          isOwnMessage,
          isReply: isReplyMessage,
        });

        // DISPATCH DIRECT MESSAGE
        dispatch(
          addDirectMessage({
            message: messageData,
            conversation_id: data.conversation_id,
            currentUserId: user_id,
            isGroup: false,
            isOptimistic: false,
            replaceOptimistic: true,
            tempId: messageData.tempId,
          })
        );
      });

      // 🆕 THÊM: Listener cho direct reply messages
      // THAY THẾ đoạn code text_message_reply listener hiện tại bằng:

      sock.on("text_message_reply", (data) => {
        console.log("11111", data);

        // 🆕 SỬA QUAN TRỌNG: Xử lý trực tiếp reply message thay vì emit lại
        if (!data || !data.conversation_id) {
          console.warn("🚨 Socket: Invalid direct reply message data", data);
          return;
        }

        const isOwnMessage = data.from === user_id;
        const isReplyMessage = data.subtype === "reply";

        console.log("🔍 Processing direct reply message:", {
          conversation_id: data.conversation_id,
          message_id: data._id || data.id,
          from: data.from,
          to: data.to,
          isOwnMessage,
          isReplyMessage,
          has_replyTo: !!data.replyTo,
        });

        // 🆕 XỬ LÝ replyTo.sender
        let processedReplyTo = data.replyTo;
        if (processedReplyTo && typeof processedReplyTo.sender === "string") {
          processedReplyTo = {
            ...processedReplyTo,
            sender: {
              keycloakId: processedReplyTo.sender,
              username: "Unknown",
            },
          };
        }

        const messageData = {
          _id: data._id || data.id,
          id: data.id || data._id,
          message: data.message || data.content,
          content: data.message || data.content,
          type: "msg",
          subtype: isReplyMessage ? "reply" : data.type || "text",
          incoming: !isOwnMessage,
          outgoing: isOwnMessage,
          time: data.time || formatMessageTime(data.createdAt || new Date()),
          createdAt: data.createdAt || new Date(),
          attachments: data.attachments || [],
          sender: data.sender || {
            keycloakId: data.from,
            username: data.sender?.username || "Unknown",
          },
          replyTo: processedReplyTo,
          isOptimistic: false,
          tempId: data.tempId || data.messageId,
        };

        console.log("✅ Prepared DIRECT REPLY message data for dispatch:", {
          conversation_id: data.conversation_id,
          message_id: messageData.id,
          isOwnMessage,
          isReply: isReplyMessage,
          has_replyTo: !!messageData.replyTo,
        });

        // 🆕 DISPATCH DIRECT REPLY MESSAGE
        dispatch(
          addDirectMessage({
            message: messageData,
            conversation_id: data.conversation_id,
            currentUserId: user_id,
            isGroup: false,
            isOptimistic: false,
            replaceOptimistic: true,
            tempId: messageData.tempId,
          })
        );
      });

      // ==================== GROUP CHAT EVENTS ====================
      sock.on("new_group_message", (data) => {
        console.log("🔌 Socket: new_group_message received - FULL DATA:", data);

        const roomId = data.roomId || data.room_id;
        const msg = data.message || data;

        console.log("🔍 Parsed data:", {
          roomId,
          message_id: msg?.id,
          sender_id: msg?.sender,
          current_user_id: user_id,
          tempId: msg?.tempId || msg?.messageId,
        });

        if (!msg || !roomId) {
          console.warn("🚨 Socket: Invalid group message data", data);
          return;
        }

        const isReplyMessage = msg.type === "reply";
        const isOwnMessage = msg.sender?.keycloakId === user_id;

        if (isOwnMessage) {
          console.log(
            "🔄 Processing own message from socket - REPLACING optimistic update",
            {
              tempId: msg.tempId || msg.messageId,
              isReply: isReplyMessage,
            }
          );

          let processedReplyTo = msg.replyTo;
          if (processedReplyTo && typeof processedReplyTo.sender === "string") {
            processedReplyTo = {
              ...processedReplyTo,
              sender: {
                keycloakId: processedReplyTo.sender,
                username: "Unknown",
              },
            };
          }

          const messageData = {
            _id: msg._id || msg.id,
            id: msg.id || msg._id,
            content: msg.content,
            message: msg.content,
            type: "msg",
            subtype: isReplyMessage ? "reply" : msg.type || "text",
            sender: {
              keycloakId: msg.sender?.keycloakId,
              username: msg.sender?.username || "Unknown",
              ...msg.sender,
            },
            replyTo: processedReplyTo,
            createdAt: msg.createdAt,
            time: formatMessageTime(msg.createdAt),
            incoming: false,
            outgoing: true,
            isOptimistic: false,
            tempId: msg.tempId || msg.messageId,
          };

          dispatch(
            addGroupMessage({
              room_id: roomId,
              message: messageData,
              isOptimistic: false,
              replaceOptimistic: true,
              tempId: messageData.tempId,
            })
          );
          return;
        }

        const isOutgoing = msg.sender?.keycloakId === user_id;

        let processedReplyTo = msg.replyTo;
        if (processedReplyTo && typeof processedReplyTo.sender === "string") {
          processedReplyTo = {
            ...processedReplyTo,
            sender: {
              keycloakId: processedReplyTo.sender,
              username: "Unknown",
            },
          };
        }

        const messageData = {
          _id: msg._id || msg.id,
          id: msg.id || msg._id,
          content: msg.content,
          message: msg.content,
          type: "msg",
          subtype: isReplyMessage ? "reply" : msg.type || "text",
          sender: {
            keycloakId: msg.sender?.keycloakId,
            username: msg.sender?.username || "Unknown",
            ...msg.sender,
          },
          replyTo: processedReplyTo,
          createdAt: msg.createdAt,
          time: formatMessageTime(msg.createdAt),
          incoming: !isOutgoing,
          outgoing: isOutgoing,
          isOptimistic: false,
        };

        dispatch(
          addGroupMessage({
            room_id: roomId,
            message: messageData,
            isOptimistic: false,
          })
        );
      });

      // Lắng nghe sự kiện message bị xóa từ server
      sock.on("message_deleted", (data) => {
        try {
          console.log("📨 Received message_deleted event:", data);

          const {
            messageId,
            conversationId,
            roomId,
            deletedBy,
            isGroup,
            timestamp,
          } = data;

          // 🆕 DISPATCH ACTION ĐỂ CẬP NHẬT REDUX STORE
          if (isGroup) {
            // Xóa message khỏi group chat
            dispatch({
              type: "conversation/deleteMessage",
              payload: {
                messageId,
                isGroup: true,
              },
            });
          } else {
            // Xóa message khỏi direct chat
            dispatch({
              type: "conversation/deleteMessage",
              payload: {
                messageId,
                isGroup: false,
              },
            });
          }

          console.log("✅ UI updated for deleted message:", messageId);
        } catch (error) {
          console.error("❌ Error handling message_deleted event:", error);
        }
      });

      // Các listeners khác giữ nguyên
      sock.on("start_chat", (data) => {
        console.log("🔌 Socket: start_chat received", {
          conversation_id: data._id,
          has_participants: !!data.participants,
          participants_count: data.participants?.length,
        });

        if (!data.participants || data.participants.length === 0) {
          console.warn("🚨 Socket: Conversation has no participants", data);
          return;
        }

        const existed = conversations.find((c) => c.id === data._id);
        if (existed) {
          dispatch(
            updateDirectConversation({
              conversation: data,
              currentUserId: user_id,
            })
          );
        } else {
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

      sock.on("update_group_room", (room) => {
        console.log("🔌 Socket: update_group_room received", {
          room_id: room._id,
          name: room.name,
          members_count: room.members?.length,
        });

        if (!room.members || room.members.length === 0) {
          console.warn("🚨 Socket: Room has no members", room);
          return;
        }

        dispatch(updateGroupRoom({ room }));
      });

      sock.on("update_conversation", (conversation) => {
        console.log("🔌 Socket: update_conversation received", {
          conversation_id: conversation._id,
          has_participants: !!conversation.participants,
          participants: conversation.participants,
        });

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

        dispatch(
          updateDirectConversation({ conversation, currentUserId: user_id })
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

      sock.on("audio_call_notification", (data) => {
        dispatch(PushToAudioCallQueue(data));
      });

      sock.on("video_call_notification", (data) => {
        dispatch(PushToVideoCallQueue(data));
      });

      // Debug: Log tất cả socket events
      sock.onAny((eventName, ...args) => {
        if (
          ![
            "new_message",
            "new_group_message",
            "user_online",
            "user_offline",
            "text_message",
            "text_message_reply",
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
  ]);

  const { room_id, chat_type } = useSelector((state) => state.app);

  useEffect(() => {
    const sock = getSocket();
    if (!sock || !room_id || !chat_type) return;

    console.log("🔄 App state changed - Auto joining conversation:", {
      room_id,
      chat_type,
    });
    sock.emit("leave_group_room", { roomId: room_id });
    sock.emit("join_group_room", { roomId: room_id });
  }, [room_id, chat_type]);

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
