import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Divider,
  IconButton,
  Stack,
  Typography,
  CircularProgress,
} from "@mui/material";
import { ArchiveBox, MagnifyingGlass, Users } from "phosphor-react";
import { SimpleBarStyle } from "../../components/Scrollbar";
import { useTheme } from "@mui/material/styles";
import useResponsive from "../../hooks/useResponsive";
import BottomNav from "../../layouts/dashboard/BottomNav";
import ChatElement from "../../components/ChatElement";
import {
  Search,
  SearchIconWrapper,
  StyledInputBase,
} from "../../components/Search";
import Friends from "../../sections/dashboard/Friends";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchDirectConversations,
  setCurrentConversation,
  setCurrentGroupRoom, // 🆕 THÊM IMPORT NÀY
} from "../../redux/slices/conversation";
import { SelectConversation } from "../../redux/slices/app";
import { useKeycloak } from "@react-keycloak/web";
import { getSocket, socketEvents } from "../../socket";

const Chats = () => {
  const theme = useTheme();
  const isDesktop = useResponsive("up", "md");
  const dispatch = useDispatch();
  const { keycloak, initialized } = useKeycloak();
  const [openDialog, setOpenDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const currentUserId = keycloak?.tokenParsed?.sub;

  const {
    conversations = [],
    isLoading,
    current_conversation,
  } = useSelector((state) => state.conversation.direct_chat || {});

  // Lấy room_id từ app state để biết conversation nào đang active
  const { room_id, chat_type } = useSelector((state) => state.app);

  const keycloakId =
    initialized && keycloak.authenticated ? keycloak.tokenParsed?.sub : null;

  // Fetch conversations via socket
  useEffect(() => {
    if (!keycloakId) return;

    const handleSocketReady = (sock) => {
      console.log("🔌 Socket ready, fetching conversations...", keycloakId);
      sock.emit(
        "get_direct_conversations",
        { keycloakId: currentUserId },
        (conversations) => {
          console.log("📥 Conversations received from server:", conversations);
          dispatch(fetchDirectConversations({ conversations, currentUserId }));
        }
      );
    };

    const sock = getSocket();
    if (sock && sock.connected) handleSocketReady(sock);
    else socketEvents.once("socket_ready", handleSocketReady);

    return () => {
      socketEvents.off("socket_ready", handleSocketReady);
    };
  }, [keycloakId, dispatch, currentUserId]);

  // Debug current conversation
  useEffect(() => {
    console.log("🔍 Chats - current_conversation:", current_conversation);
    console.log("🔍 Chats - room_id:", room_id);
    console.log("🔍 Chats - chat_type:", chat_type);
  }, [current_conversation, room_id, chat_type]);

  const handleCloseDialog = () => setOpenDialog(false);
  const handleOpenDialog = () => setOpenDialog(true);

  // 🆕 SỬA HOÀN TOÀN: Handle conversation click - CLEAR GROUP STATE TRƯỚC
  const handleConversationClick = (conversation) => {
    console.log("💬 Conversation clicked:", conversation);

    // 🆕 QUAN TRỌNG: Clear current group room trước khi set direct conversation
    dispatch(setCurrentGroupRoom(null));

    // 1. Dispatch action để set current conversation trong conversation state
    dispatch(setCurrentConversation(conversation));

    // 2. Select conversation trong app state
    dispatch(
      SelectConversation({
        room_id: conversation.id,
        chat_type: "individual",
        chat_info: {
          id: conversation.id,
          name: conversation.name,
          isGroup: false,
          online: conversation.online,
          img: conversation.img,
          user_id: conversation.user_id,
          about: conversation.about || "",
          lastSeen: conversation.lastSeen || "",
        },
      })
    );

    console.log("✅ Updated app state for DIRECT chat:", {
      room_id: conversation.id,
      chat_type: "individual",
    });
  };

  // Filter conversations
  const filteredConversations = conversations.filter(
    (conv) =>
      conv?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv?.msg?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box
      sx={{
        position: "relative",
        height: "100%",
        width: isDesktop ? 320 : "100vw",
        backgroundColor:
          theme.palette.mode === "light"
            ? "#F8FAFF"
            : theme.palette.background.paper,
        boxShadow: "0px 0px 2px rgba(0, 0, 0, 0.25)",
      }}
    >
      {!isDesktop && <BottomNav />}

      <Stack p={3} spacing={2} sx={{ maxHeight: "100vh" }}>
        {/* Header */}
        <Stack
          alignItems={"center"}
          justifyContent="space-between"
          direction="row"
        >
          <Stack alignItems="center" direction="row" spacing={1}>
            <Typography variant="h5">Chats</Typography>
            <Typography variant="caption" color="text.secondary">
              {conversations.length} chats
            </Typography>
          </Stack>

          <IconButton onClick={handleOpenDialog}>
            <Users size={20} />
          </IconButton>
        </Stack>

        {/* Search */}
        <Stack sx={{ width: "100%" }}>
          <Search>
            <SearchIconWrapper>
              <MagnifyingGlass color="#709CE6" />
            </SearchIconWrapper>
            <StyledInputBase
              placeholder="Search…"
              inputProps={{ "aria-label": "search" }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Search>
        </Stack>

        {/* Archive */}
        <Stack spacing={1}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <ArchiveBox size={20} />
            <Button variant="text">Archive</Button>
          </Stack>
          <Divider />
        </Stack>

        {/* Chat list */}
        <Stack sx={{ flexGrow: 1, overflow: "hidden", height: "100%" }}>
          <SimpleBarStyle timeout={500} clickOnTrack={false}>
            <Stack spacing={2.4}>
              <Typography variant="subtitle2" sx={{ color: "#676667" }}>
                All Chats ({filteredConversations.length})
              </Typography>

              {isLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : filteredConversations.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Typography variant="body2" sx={{ color: "#999", mb: 1 }}>
                    {conversations.length === 0
                      ? "No chats yet"
                      : "No chats match your search"}
                  </Typography>
                  {conversations.length === 0 && (
                    <Typography variant="caption" sx={{ color: "#999" }}>
                      Start a conversation with friends!
                    </Typography>
                  )}
                </Box>
              ) : (
                filteredConversations.map((conv, idx) => {
                  // Xác định xem conversation này có đang active không
                  const isActive =
                    room_id === conv.id && chat_type === "individual";

                  return (
                    <ChatElement
                      key={conv.id || idx}
                      id={conv.id}
                      currentRoomId={conv.id || idx}
                      name={conv.name || "Unknown"}
                      img={conv.img || ""}
                      online={conv.online || false}
                      unread={conv.unread || 0}
                      msg={conv.msg || ""}
                      time={conv.time || ""}
                      conversation={conv}
                      isGroup={false}
                      membersCount={1}
                      onlineMembers={conv.online ? 1 : 0}
                      about={conv.about}
                      user_id={conv.user_id}
                      pinned={conv.pinned}
                      lastSeen={conv.lastSeen}
                      onClick={() => handleConversationClick(conv)}
                      isActive={isActive}
                    />
                  );
                })
              )}
            </Stack>
          </SimpleBarStyle>
        </Stack>
      </Stack>

      {openDialog && (
        <Friends open={openDialog} handleClose={handleCloseDialog} />
      )}
    </Box>
  );
};

export default Chats;
