import React from "react";
import { useTheme } from "@mui/material/styles";
import { Box, Stack, Typography } from "@mui/material";
import { Link, useSearchParams } from "react-router-dom";
import ChatComponent from "./Conversation";
import Chats from "./Chats";
import Group from "./Group";
import Contact from "../../sections/dashboard/Contact";
import NoChat from "../../assets/Illustration/NoChat";
import { useSelector } from "react-redux";
import StarredMessages from "../../sections/dashboard/StarredMessages";
import Media from "../../sections/dashboard/SharedMessages";

const GeneralBase = ({ type = "individual" }) => {
  const [searchParams] = useSearchParams();
  const theme = useTheme();
  const { sideBar, room_id, chat_type } = useSelector((state) => state.app);

  // Chọn panel bên trái dựa vào type
  const LeftPanel = type === "group" ? Group : Chats;

  // Text hiển thị khi không có chat
  const getNoChatText = () => {
    if (type === "group") {
      return "Select a group conversation or start a";
    }
    return "Select a conversation or start a";
  };

  // Kiểm tra điều kiện hiển thị ChatComponent
  const shouldShowChatComponent = () => {
    if (type === "group") {
      return chat_type === "group" && room_id !== null;
    }
    return chat_type === "individual" && room_id !== null;
  };

  return (
    <Stack direction="row" sx={{ width: "100%" }}>
      {/* Left Panel */}
      <LeftPanel />

      {/* Chat / Content Panel */}
      <Box
        sx={{
          height: "100%",
          width: sideBar.open ? `calc(100vw - 740px )` : "calc(100vw - 420px )",
          backgroundColor:
            theme.palette.mode === "light"
              ? "#FFF"
              : theme.palette.background.paper,
          borderBottom:
            searchParams.get("type") === "individual-chat" &&
            searchParams.get("id")
              ? "0px"
              : "6px solid #0162C4",
        }}
      >
        {shouldShowChatComponent() ? (
          <ChatComponent />
        ) : (
          <Stack
            spacing={2}
            sx={{ height: "100%", width: "100%" }}
            alignItems="center"
            justifyContent={"center"}
          >
            <NoChat />
            <Typography variant="subtitle2">
              {getNoChatText()}{" "}
              <Link
                style={{
                  color: theme.palette.primary.main,
                  textDecoration: "none",
                }}
                to="/"
              >
                new one
              </Link>
            </Typography>
          </Stack>
        )}
      </Box>

      {/* Sidebar components */}
      {sideBar.open &&
        (() => {
          switch (sideBar.type) {
            case "CONTACT":
              return <Contact />;
            case "STARRED":
              return <StarredMessages />;
            case "SHARED":
              return <Media />;
            default:
              return null;
          }
        })()}
    </Stack>
  );
};

export default GeneralBase;
