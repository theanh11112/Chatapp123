// ChatElement.js - ĐÃ SỬA LỖI MESSAGES BỊ RESET
import React, { useState, useRef, useCallback } from "react";
import { Box, Badge, Stack, Avatar, Typography } from "@mui/material";
import { styled, useTheme, alpha } from "@mui/material/styles";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCurrentMessages,
  setCurrentConversation,
  setCurrentGroupRoom,
} from "../redux/slices/conversation";
import { SelectConversation } from "../redux/slices/app";

const truncateText = (text, n) =>
  text?.length > n ? `${text.slice(0, n)}...` : text;

const StyledChatBox = styled(Box)(({ theme }) => ({
  "&:hover": {
    cursor: "pointer",
    backgroundColor:
      theme.palette.mode === "light"
        ? alpha(theme.palette.primary.main, 0.05)
        : alpha(theme.palette.primary.main, 0.1),
  },
}));

const StyledBadge = styled(Badge)(({ theme }) => ({
  "& .MuiBadge-badge": {
    backgroundColor: "#44b700",
    color: "#44b700",
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    width: 12,
    height: 12,
    borderRadius: "50%",
    "&::after": {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      borderRadius: "50%",
      animation: "ripple 1.2s infinite ease-in-out",
      border: "1px solid currentColor",
      content: '""',
    },
  },
  "@keyframes ripple": {
    "0%": {
      transform: "scale(.8)",
      opacity: 1,
    },
    "100%": {
      transform: "scale(2.4)",
      opacity: 0,
    },
  },
}));

const GroupBadge = styled(Box)(({ theme }) => ({
  width: 14,
  height: 14,
  backgroundColor: theme.palette.primary.main,
  borderRadius: "50%",
  position: "absolute",
  bottom: 2,
  right: 2,
  border: `2px solid ${theme.palette.background.paper}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 8,
  color: "white",
  fontWeight: "bold",
  zIndex: 1,
}));

const ChatElement = ({
  id,
  img,
  name,
  msg,
  time,
  unread,
  online,
  currentRoomId,
  conversation,
  isGroup = false,
  membersCount = 0,
  onlineMembers = 0,
  user_id,
  about,
  lastSeen,
  pinned = false,
  onClick,
  isActive = false,
}) => {
  const dispatch = useDispatch();
  const theme = useTheme();

  const { room_id, chat_type } = useSelector((state) => state.app);
  const selectedChatId = room_id?.toString();
  const isSelected = selectedChatId === id?.toString() || isActive;

  // Lấy user_id từ auth state
  const authState = useSelector((state) => state.auth);
  const currentUserId = authState?.user_id || authState?.keycloak?.sub || null;

  // 🆕 THÊM: Lấy current_room từ Redux để có messages thực tế
  const { current_room } = useSelector(
    (state) => state.conversation.group_chat
  );
  const { rooms } = useSelector((state) => state.conversation.group_chat);

  // Ref để theo dõi thời gian click
  const lastClickTimeRef = useRef(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // 🆕 SỬA QUAN TRỌNG: Xử lý click với logic lấy messages đúng
  const handleClick = useCallback(() => {
    if (!id) {
      console.error("❌ ChatElement: Missing id");
      return;
    }

    const now = Date.now();

    // Chặn double click trong 500ms
    if (now - lastClickTimeRef.current < 500) {
      console.log("🚫 Double click detected, ignoring...", {
        id,
        name,
        timeSinceLastClick: now - lastClickTimeRef.current,
      });
      return;
    }

    // Chặn đang processing
    if (isProcessing) {
      console.log("⏳ Previous click still processing, ignoring...");
      return;
    }

    lastClickTimeRef.current = now;
    setIsProcessing(true);

    console.log("🔄 ChatElement - Processing click:", {
      id,
      isGroup,
      name,
      currentUserId,
      existing_room_id: room_id,
      existing_chat_type: chat_type,
    });

    // Nếu có onClick từ parent, gọi nó
    if (onClick) {
      console.log("📞 Calling parent onClick");
      onClick();
      setIsProcessing(false);
      return;
    }

    // Kiểm tra currentUserId
    if (!currentUserId) {
      console.error("❌ ChatElement: currentUserId is null, cannot proceed");
      setIsProcessing(false);
      return;
    }

    // 🆕 XỬ LÝ CLICK VỚI MESSAGES ĐÚNG
    if (isGroup) {
      // GROUP CHAT - 🆕 SỬA QUAN TRỌNG: Tìm messages từ nhiều nguồn
      let actualMessages = [];

      // Ưu tiên 1: Messages từ current_room nếu đang active
      if (current_room?.id === id) {
        actualMessages = current_room.messages || [];
        console.log(
          "📥 Using messages from current_room:",
          actualMessages.length
        );
      }
      // Ưu tiên 2: Messages từ rooms list
      else if (rooms && rooms.length > 0) {
        const roomFromList = rooms.find((room) => room.id === id);
        actualMessages = roomFromList?.messages || [];
        console.log(
          "📥 Using messages from rooms list:",
          actualMessages.length
        );
      }
      // Ưu tiên 3: Messages từ conversation prop
      else {
        actualMessages = conversation?.messages || [];
        console.log(
          "📥 Using messages from conversation prop:",
          actualMessages.length
        );
      }

      const roomData = {
        id,
        name,
        messages: actualMessages, // 🆕 SỬ DỤNG MESSAGES THỰC TẾ
        membersCount,
        onlineMembers,
        img,
        isGroup: true,
        about: about || "",
        lastMessage: msg ? { content: msg } : null,
        topic: about || "",
        createdBy: user_id ? { keycloakId: user_id } : {},
        pinnedMessages: pinned ? [{}] : [],
      };

      console.log("🔄 Setting group room:", {
        id,
        name,
        messagesCount: roomData.messages.length,
        source:
          current_room?.id === id
            ? "current_room"
            : rooms?.find((r) => r.id === id)
            ? "rooms_list"
            : "conversation_prop",
      });

      // 1. Set current group room - 🆕 THÊM: Chỉ set nếu khác room hiện tại
      if (room_id !== id) {
        dispatch(setCurrentGroupRoom(roomData));
      } else {
        console.log("ℹ️ Same room, skipping setCurrentGroupRoom");
      }

      // 2. Select conversation trong app state
      dispatch(
        SelectConversation({
          room_id: id,
          chat_type: "group",
          chat_info: {
            id,
            name,
            isGroup: true,
            membersCount,
            onlineMembers,
            img,
            online: onlineMembers > 0,
            about: about || "",
          },
        })
      );
    } else {
      // DIRECT CHAT (giữ nguyên)
      const convData = {
        id,
        name,
        online,
        img,
        messages: conversation?.messages || [],
        user_id: user_id || conversation?.user_id,
        about: about || "",
        lastSeen: lastSeen || "",
        msg: msg || "",
        time: time || "",
      };

      console.log("🔄 Setting direct conversation:", convData);

      // 1. Set current conversation
      dispatch(setCurrentConversation(convData));

      // 2. Fetch current messages
      if (conversation?.messages && currentUserId) {
        dispatch(
          fetchCurrentMessages({
            messages: conversation.messages,
            currentUserId,
          })
        );
      }

      // 3. Select conversation trong app state
      dispatch(
        SelectConversation({
          room_id: id,
          chat_type: "individual",
          chat_info: {
            id,
            name,
            isGroup: false,
            online,
            img,
            user_id: user_id || conversation?.user_id,
            about: about || "",
            lastSeen: lastSeen || "",
          },
        })
      );
    }

    console.log("✅ Chat selection completed");

    // Reset processing state
    setTimeout(() => {
      setIsProcessing(false);
    }, 100);
  }, [
    id,
    isGroup,
    name,
    currentUserId,
    room_id,
    chat_type,
    conversation,
    membersCount,
    onlineMembers,
    img,
    about,
    msg,
    user_id,
    pinned,
    lastSeen,
    time,
    onClick,
    dispatch,
    isProcessing,
    current_room, // 🆕 THÊM dependency
    rooms, // 🆕 THÊM dependency
  ]);

  return (
    <StyledChatBox
      onClick={handleClick}
      sx={{
        width: "100%",
        borderRadius: 1,
        backgroundColor: isSelected
          ? theme.palette.mode === "light"
            ? alpha(theme.palette.primary.main, 0.1)
            : alpha(theme.palette.primary.main, 0.2)
          : theme.palette.mode === "light"
          ? "#fff"
          : theme.palette.background.paper,
        position: "relative",
        border: isSelected ? `2px solid ${theme.palette.primary.main}` : "none",
        transition: "all 0.2s ease-in-out",
        opacity: isProcessing ? 0.7 : 1,
        pointerEvents: isProcessing ? "none" : "auto",
      }}
      p={2}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={2} alignItems="center">
          {/* Avatar với indicator */}
          <Box
            sx={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Avatar
              alt={name}
              src={img}
              sx={{
                width: 48,
                height: 48,
                position: "relative",
              }}
            />

            {!isGroup && online ? (
              <StyledBadge
                overlap="circular"
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "right",
                }}
                variant="dot"
                sx={{
                  position: "absolute",
                  bottom: 2,
                  right: 2,
                }}
              >
                <Box sx={{ width: 48, height: 48 }} />
              </StyledBadge>
            ) : isGroup ? (
              <GroupBadge>{membersCount > 9 ? "9+" : membersCount}</GroupBadge>
            ) : null}
          </Box>

          {/* Content */}
          <Stack spacing={0.3} sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle2" noWrap>
              {name}
              {pinned && " 📌"}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              sx={{
                maxWidth: "150px",
              }}
            >
              {truncateText(msg, 20)}
            </Typography>
          </Stack>
        </Stack>

        {/* Meta info */}
        <Stack spacing={1} alignItems="flex-end">
          <Typography sx={{ fontWeight: 600 }} variant="caption">
            {time}
          </Typography>
          {isGroup && (
            <Typography
              variant="caption"
              color="text.secondary"
              fontSize="10px"
            >
              {onlineMembers}/{membersCount}
            </Typography>
          )}
          {unread > 0 && (
            <Badge
              color="primary"
              badgeContent={unread}
              sx={{
                "& .MuiBadge-badge": {
                  fontSize: "0.6rem",
                  height: "16px",
                  minWidth: "16px",
                },
              }}
            />
          )}
        </Stack>
      </Stack>
    </StyledChatBox>
  );
};

export default React.memo(ChatElement);
