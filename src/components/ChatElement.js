// ChatElement.jsx
import React from "react";
import { Box, Badge, Stack, Avatar, Typography } from "@mui/material";
import { styled, useTheme, alpha } from "@mui/material/styles";
import { useDispatch, useSelector } from "react-redux";
import {
  FetchCurrentMessages,
  SetCurrentConversation,
} from "../redux/slices/conversation";
import { SelectConversation } from "../redux/slices/app";

// Hàm rút ngắn nội dung tin nhắn
const truncateText = (text, n) =>
  text?.length > n ? `${text.slice(0, n)}...` : text;

// Styled components
const StyledChatBox = styled(Box)(({ theme }) => ({
  "&:hover": { cursor: "pointer" },
}));

const StyledBadge = styled(Badge)(({ theme }) => ({
  "& .MuiBadge-badge": {
    backgroundColor: "#44b700",
    color: "#44b700",
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
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
    "0%": { transform: "scale(.8)", opacity: 1 },
    "100%": { transform: "scale(2.4)", opacity: 0 },
  },
}));

const ChatElement = ({
  img,
  name,
  msg,
  time,
  unread,
  online,
  currentRoomId,
  conversation,
}) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const { room_id } = useSelector((state) => state.app);
  const selectedChatId = room_id?.toString();
  const isSelected = selectedChatId === currentRoomId?.toString();

  const { keycloak } = useSelector((state) => state.auth || {});
  const currentUserId = keycloak?.sub || null;

  // Khi click vào chat
  const handleClick = () => {
    if (room_id === currentRoomId) return; // Nếu đã chọn rồi thì không làm gì

    // Dispatch messages hiện có trong props conversation
    dispatch(FetchCurrentMessages({ messages: conversation, currentUserId }));
    console.log("✅ Dispatch FetchCurrentMessages từ conversation props");

    // Cập nhật conversation hiện tại
    dispatch(SetCurrentConversation(conversation));
    console.log(
      "✅ Dispatch SetCurrentConversation với conversation:",
      conversation
    );

    // ✅ Cập nhật room_id trong app slice
    dispatch(SelectConversation({ room_id: currentRoomId }));
    console.log("✅ Dispatch SelectConversation với room_id:", currentRoomId);
  };

  return (
    <StyledChatBox
      onClick={handleClick}
      sx={{
        width: "100%",
        borderRadius: 1,
        backgroundColor: isSelected
          ? theme.palette.mode === "light"
            ? alpha(theme.palette.primary.main, 0.5)
            : theme.palette.primary.main
          : theme.palette.mode === "light"
          ? "#fff"
          : theme.palette.background.paper,
      }}
      p={2}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={2}>
          {online ? (
            <StyledBadge
              overlap="circular"
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              variant="dot"
            >
              <Avatar alt={name} src={img} />
            </StyledBadge>
          ) : (
            <Avatar alt={name} src={img} />
          )}
          <Stack spacing={0.3}>
            <Typography variant="subtitle2">{name}</Typography>
            <Typography variant="caption">{truncateText(msg, 20)}</Typography>
          </Stack>
        </Stack>
        <Stack spacing={2} alignItems="center">
          <Typography sx={{ fontWeight: 600 }} variant="caption">
            {time}
          </Typography>
          {unread > 0 && <Badge color="primary" badgeContent={unread} />}
        </Stack>
      </Stack>
    </StyledChatBox>
  );
};

export default ChatElement;
