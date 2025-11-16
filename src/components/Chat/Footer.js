import {
  Box,
  Fab,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
} from "@mui/material";
import {
  Camera,
  File,
  Image,
  LinkSimple,
  PaperPlaneTilt,
  Smiley,
  Sticker,
  User,
} from "phosphor-react";
import { useTheme, styled } from "@mui/material/styles";
import React, { useRef, useState } from "react";
import useResponsive from "../../hooks/useResponsive";

import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { socket } from "../../socket";
import { useSelector, useDispatch } from "react-redux";
import { addDirectMessage } from "../../redux/slices/conversation";
import { v4 as uuidv4 } from "uuid";

const StyledInput = styled(TextField)(({ theme }) => ({
  "& .MuiInputBase-input": {
    paddingTop: "12px !important",
    paddingBottom: "12px !important",
  },
}));

const Actions = [
  { color: "#4da5fe", icon: <Image size={24} />, y: 102, title: "Photo/Video" },
  { color: "#1b8cfe", icon: <Sticker size={24} />, y: 172, title: "Stickers" },
  { color: "#0172e4", icon: <Camera size={24} />, y: 242, title: "Image" },
  { color: "#0159b2", icon: <File size={24} />, y: 312, title: "Document" },
  { color: "#013f7f", icon: <User size={24} />, y: 382, title: "Contact" },
];

const ChatInput = ({
  openPicker,
  setOpenPicker,
  setValue,
  value,
  inputRef,
  handleSendMessage,
}) => {
  const [openActions, setOpenActions] = useState(false);

  return (
    <StyledInput
      inputRef={inputRef}
      value={value}
      onChange={(event) => {
        setValue(event.target.value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSendMessage();
        }
      }}
      fullWidth
      placeholder="Write a message..."
      variant="filled"
      InputProps={{
        disableUnderline: true,
        startAdornment: (
          <Stack sx={{ width: "max-content" }}>
            <Stack
              sx={{
                position: "relative",
                display: openActions ? "inline-block" : "none",
              }}
            >
              {Actions.map((el) => (
                <Tooltip placement="right" title={el.title} key={el.title}>
                  <Fab
                    onClick={() => setOpenActions(!openActions)}
                    sx={{
                      position: "absolute",
                      top: -el.y,
                      backgroundColor: el.color,
                    }}
                  >
                    {el.icon}
                  </Fab>
                </Tooltip>
              ))}
            </Stack>

            <InputAdornment>
              <IconButton onClick={() => setOpenActions(!openActions)}>
                <LinkSimple />
              </IconButton>
            </InputAdornment>
          </Stack>
        ),
        endAdornment: (
          <Stack sx={{ position: "relative" }}>
            <InputAdornment>
              <IconButton onClick={() => setOpenPicker(!openPicker)}>
                <Smiley />
              </IconButton>
            </InputAdornment>
          </Stack>
        ),
      }}
    />
  );
};

function linkify(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(
    urlRegex,
    (url) => `<a href="${url}" target="_blank">${url}</a>`
  );
}

function containsUrl(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return urlRegex.test(text);
}

// ----------------------------------------------------------------------
const Footer = () => {
  const theme = useTheme();
  const dispatch = useDispatch();

  const { current_conversation } = useSelector(
    (state) => state.conversation.direct_chat
  );
  const conversationId = current_conversation?.id;

  const { sideBar, room_id } = useSelector((state) => state.app);

  const user_id = window.localStorage.getItem("user_id");

  const isMobile = useResponsive("between", "md", "xs", "sm");

  const [openPicker, setOpenPicker] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  const handleEmojiClick = (emoji) => {
    const input = inputRef.current;
    if (input) {
      const start = input.selectionStart;
      const end = input.selectionEnd;

      setValue(value.slice(0, start) + emoji + value.slice(end));

      input.selectionStart = input.selectionEnd = start + emoji.length;
    }
  };

  const handleSendMessage = () => {
    if (!value.trim() || !current_conversation || !current_conversation.user_id)
      return;

    const messageId = uuidv4();
    const messageData = {
      id: messageId,
      type: "msg",
      subtype: containsUrl(value) ? "Link" : "Text",
      message: value,
      incoming: false,
      outgoing: true,
      time: new Date().toISOString(),
      attachments: [],
    };

    // 1️⃣ Cập nhật UI ngay
    dispatch(
      addDirectMessage({
        message: messageData,
        conversation_id: current_conversation.id,
      })
    );

    // 2️⃣ Emit lên server
    socket.emit("text_message", {
      id: messageId, // ⚡ gửi id đồng bộ
      message: linkify(value),
      conversation_id: current_conversation.id,
      from: user_id,
      to: current_conversation.user_id,
      type: containsUrl(value) ? "Link" : "Text",
    });

    setValue("");
  };

  return (
    <Box
      sx={{ position: "relative", backgroundColor: "transparent !important" }}
    >
      <Box
        p={isMobile ? 1 : 2}
        width="100%"
        sx={{
          backgroundColor:
            theme.palette.mode === "light"
              ? "#F8FAFF"
              : theme.palette.background,
          boxShadow: "0px 0px 2px rgba(0, 0, 0, 0.25)",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={isMobile ? 1 : 3}>
          <Stack sx={{ width: "100%" }}>
            {openPicker && (
              <Box
                sx={{
                  zIndex: 10,
                  position: "fixed",
                  bottom: 81,
                  right: isMobile ? 20 : sideBar.open ? 420 : 100,
                }}
              >
                <Picker
                  theme={theme.palette.mode}
                  data={data}
                  onEmojiSelect={(e) => handleEmojiClick(e.native)}
                />
              </Box>
            )}

            <ChatInput
              inputRef={inputRef}
              value={value}
              setValue={setValue}
              openPicker={openPicker}
              setOpenPicker={setOpenPicker}
              handleSendMessage={handleSendMessage}
            />
          </Stack>

          <Box
            sx={{
              height: 48,
              width: 48,
              backgroundColor: theme.palette.primary.main,
              borderRadius: 1.5,
            }}
          >
            <Stack
              sx={{ height: "100%" }}
              alignItems="center"
              justifyContent="center"
            >
              <IconButton onClick={handleSendMessage}>
                <PaperPlaneTilt color="#fff" />
              </IconButton>
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};

export default Footer;
