import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Divider,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import {
  ArchiveBox,
  CircleDashed,
  MagnifyingGlass,
  Users,
} from "phosphor-react";
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
import { FetchDirectConversations } from "../../redux/slices/conversation";
import { useKeycloak } from "@react-keycloak/web";
import { getSocket, socketEvents } from "../../socket";

const Chats = () => {
  const theme = useTheme();
  const isDesktop = useResponsive("up", "md");
  const dispatch = useDispatch();
  const { keycloak, initialized } = useKeycloak();
  const [openDialog, setOpenDialog] = useState(false);
  const currentUserId = keycloak?.tokenParsed?.sub;

  const { conversations = [], isLoading } = useSelector(
    (state) => state.conversation.direct_chat || {}
  );

  const keycloakId =
    initialized && keycloak.authenticated ? keycloak.tokenParsed?.sub : null;

  // Fetch conversations via socket
  console.log("444", conversations);
  useEffect(() => {
    if (!keycloakId) return;

    const handleSocketReady = (sock) => {
      console.log("🔌 Socket ready, fetching conversations...", keycloakId);
      sock.emit(
        "get_direct_conversations",
        { keycloakId: currentUserId },
        (conversations) => {
          dispatch(FetchDirectConversations({ conversations, currentUserId }));
          console.log("📥 Conversations received from server:", conversations);
        }
      );
    };
    console.log("conversations", conversations);
    const sock = getSocket();
    if (sock && sock.connected) handleSocketReady(sock);
    else socketEvents.once("socket_ready", handleSocketReady);

    return () => {
      socketEvents.off("socket_ready", handleSocketReady);
    };
  }, [keycloakId, dispatch]);

  const handleCloseDialog = () => setOpenDialog(false);
  const handleOpenDialog = () => setOpenDialog(true);

  return (
    <Box
      sx={{
        position: "relative",
        height: "100%",
        width: isDesktop ? 320 : "100vw",
        backgroundColor:
          theme.palette.mode === "light"
            ? "#F8FAFF"
            : theme.palette.background.default,
        boxShadow: "0px 0px 2px rgba(0, 0, 0, 0.25)",
      }}
    >
      {!isDesktop && <BottomNav />}

      <Stack p={3} spacing={2} sx={{ maxHeight: "100vh" }}>
        {/* Header */}
        <Stack
          alignItems="center"
          justifyContent="space-between"
          direction="row"
        >
          <Typography variant="h5">Chats</Typography>
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton onClick={handleOpenDialog}>
              <Users />
            </IconButton>
            <IconButton>
              <CircleDashed />
            </IconButton>
          </Stack>
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
            />
          </Search>
        </Stack>

        {/* Archive */}
        <Stack spacing={1}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <ArchiveBox size={24} />
            <Button variant="text">Archive</Button>
          </Stack>
          <Divider />
        </Stack>

        {/* Chat list */}
        <Stack sx={{ flexGrow: 1, overflow: "scroll", height: "100%" }}>
          <SimpleBarStyle timeout={500} clickOnTrack={false}>
            <Stack spacing={2.4}>
              <Typography variant="subtitle2" sx={{ color: "#676667" }}>
                All Chats
              </Typography>

              {isLoading ? (
                <Typography
                  variant="body2"
                  sx={{ color: "#999", textAlign: "center", mt: 4 }}
                >
                  Loading chats...
                </Typography>
              ) : conversations.length === 0 ? (
                <Typography
                  variant="body2"
                  sx={{ color: "#999", textAlign: "center", mt: 4 }}
                >
                  No chats yet
                </Typography>
              ) : (
                conversations.map((conv, idx) => {
                  return (
                    <ChatElement
                      key={conv.id || idx}
                      currentRoomId={conv.id || idx}
                      name={conv.name || "Unknown"}
                      img={conv.img || ""}
                      online={conv.online || false}
                      unread={conv.unread || 0}
                      msg={conv.msg || ""}
                      time={conv.time || ""}
                      conversation={conv.messages}
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
