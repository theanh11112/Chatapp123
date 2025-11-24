// Group.js - ĐÃ SỬA LỖI SCROLL HOÀN TOÀN
import React, { useState, useEffect } from "react";
import {
  Box,
  Stack,
  Typography,
  IconButton,
  Divider,
  CircularProgress,
} from "@mui/material";
import { MagnifyingGlass, Plus } from "phosphor-react";
import { useTheme } from "@mui/material/styles";
import { useDispatch, useSelector } from "react-redux";
import { SimpleBarStyle } from "../../components/Scrollbar";
import ChatElement from "../../components/ChatElement";
import {
  Search,
  SearchIconWrapper,
  StyledInputBase,
} from "../../components/Search";
import CreateGroup from "../../sections/dashboard/CreateGroup";
import { fetchGroupRooms } from "../../redux/slices/conversation";
import { useKeycloak } from "@react-keycloak/web";

const Group = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dispatch = useDispatch();
  const { keycloak } = useKeycloak();

  const groupChatState = useSelector((state) => state.conversation.group_chat);
  const rooms = groupChatState?.rooms || [];
  const isLoading = groupChatState?.isLoading || false;
  const error = groupChatState?.error || null;

  const { room_id } = useSelector((state) => state.app);
  const theme = useTheme();

  // Fetch group rooms
  useEffect(() => {
    if (keycloak.authenticated && keycloak.tokenParsed?.sub) {
      const keycloakId = keycloak.tokenParsed.sub;
      console.log("🔍 Fetching group rooms for:", keycloakId);
      dispatch(fetchGroupRooms(keycloakId));
    }
  }, [dispatch, keycloak.authenticated, keycloak.tokenParsed?.sub]);

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  // Filter rooms
  const filteredRooms = rooms.filter(
    (room) =>
      room?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room?.topic?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pinnedRooms = filteredRooms.filter((room) => room?.pinned);
  const allRooms = filteredRooms.filter((room) => !room?.pinned);

  // Render loading state
  if (isLoading && rooms.length === 0) {
    return (
      <Box
        sx={{
          position: "relative",
          height: "100vh",
          width: 320,
          backgroundColor:
            theme.palette.mode === "light"
              ? "#F8FAFF"
              : theme.palette.background.paper,
          boxShadow: "0px 0px 2px rgba(0, 0, 0, 0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Stack spacing={2} alignItems="center">
          <CircularProgress size={40} />
          <Typography variant="body2" color="text.secondary">
            Loading groups...
          </Typography>
        </Stack>
      </Box>
    );
  }

  // Render error state
  if (error && rooms.length === 0) {
    return (
      <Box
        sx={{
          position: "relative",
          height: "100vh",
          width: 320,
          backgroundColor:
            theme.palette.mode === "light"
              ? "#F8FAFF"
              : theme.palette.background.paper,
          boxShadow: "0px 0px 2px rgba(0, 0, 0, 0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography variant="body2" color="error" align="center">
          Error loading groups: {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: "relative",
        height: "100vh",
        width: 320,
        backgroundColor:
          theme.palette.mode === "light"
            ? "#F8FAFF"
            : theme.palette.background.paper,
        boxShadow: "0px 0px 2px rgba(0, 0, 0, 0.25)",
      }}
    >
      <Stack
        p={3}
        spacing={2}
        sx={{
          height: "100%",
          overflow: "hidden",
        }}
      >
        {/* Header - Chiếm khoảng 80px */}
        <Box sx={{ minHeight: "40px" }}>
          <Stack
            alignItems={"center"}
            justifyContent="space-between"
            direction="row"
          >
            <Stack alignItems="center" direction="row" spacing={1}>
              <Typography variant="h5">Groups</Typography>
              <Typography variant="caption" color="text.secondary">
                {rooms.length} groups
              </Typography>
            </Stack>
          </Stack>
        </Box>

        {/* Search - Chiếm khoảng 56px */}
        <Box sx={{ minHeight: "56px" }}>
          <Search>
            <SearchIconWrapper>
              <MagnifyingGlass color="#709CE6" />
            </SearchIconWrapper>
            <StyledInputBase
              placeholder="Search groups…"
              inputProps={{ "aria-label": "search" }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Search>
        </Box>

        {/* Create Group - Chiếm khoảng 40px */}
        <Box sx={{ minHeight: "40px" }}>
          <Stack
            justifyContent={"space-between"}
            alignItems={"center"}
            direction={"row"}
          >
            <Typography variant="subtitle2" sx={{ cursor: "pointer" }}>
              Create New Group
            </Typography>
            <IconButton onClick={handleOpenDialog}>
              <Plus style={{ color: theme.palette.primary.main }} />
            </IconButton>
          </Stack>
        </Box>

        <Divider />

        {/* 🎯 PHẦN QUAN TRỌNG: Groups List với chiều cao động */}
        <Box
          sx={{
            flex: 1, // Chiếm toàn bộ không gian còn lại
            minHeight: 0, // QUAN TRỌNG: Cho phép shrink
            overflow: "hidden",
            border: "1px solid transparent", // Debug border (có thể xóa sau)
          }}
        >
          <SimpleBarStyle
            style={{
              height: "100%",
              maxHeight: "100%",
            }}
          >
            <Stack spacing={2.4}>
              {/* Pinned Groups */}
              {pinnedRooms.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ color: "#676667" }}>
                    Pinned ({pinnedRooms.length})
                  </Typography>
                  {pinnedRooms.map((room) => (
                    <ChatElement
                      key={room.id}
                      id={room.id}
                      name={room.name || "Unnamed Group"}
                      msg={room.msg || "No messages yet"}
                      time={room.time || ""}
                      unread={room.unread || 0}
                      online={room.onlineMembers > 0}
                      currentRoomId={room_id}
                      isActive={room_id === room.id}
                      conversation={{
                        messages: room.messages || [],
                        user_id: room.createdBy?.keycloakId,
                      }}
                      isGroup={true}
                      membersCount={room.membersCount || 0}
                      onlineMembers={room.onlineMembers || 0}
                      img={room.img}
                      about={room.about}
                      user_id={room.createdBy?.keycloakId}
                      pinned={room.pinned}
                    />
                  ))}
                  <Divider />
                </>
              )}

              {/* All Groups - PHẦN CẦN SCROLL */}
              <Typography variant="subtitle2" sx={{ color: "#676667" }}>
                All Groups ({allRooms.length})
              </Typography>

              <Stack spacing={1.5}>
                {allRooms.length > 0 ? (
                  allRooms.map((room) => (
                    <ChatElement
                      key={room.id}
                      id={room.id}
                      name={room.name || "Unnamed Group"}
                      msg={room.msg || "No messages yet"}
                      time={room.time || ""}
                      unread={room.unread || 0}
                      online={room.onlineMembers > 0}
                      currentRoomId={room_id}
                      isActive={room_id === room.id}
                      conversation={{
                        messages: room.messages || [],
                        user_id: room.createdBy?.keycloakId,
                      }}
                      isGroup={true}
                      membersCount={room.membersCount || 0}
                      onlineMembers={room.onlineMembers || 0}
                      img={room.img}
                      about={room.about}
                      user_id={room.createdBy?.keycloakId}
                      pinned={room.pinned}
                    />
                  ))
                ) : rooms.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      No groups found
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Create your first group to get started!
                    </Typography>
                  </Box>
                ) : filteredRooms.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No groups match your search
                    </Typography>
                  </Box>
                ) : null}
              </Stack>
            </Stack>
          </SimpleBarStyle>
        </Box>
      </Stack>

      {/* Create Group Dialog */}
      {openDialog && (
        <CreateGroup open={openDialog} handleClose={handleCloseDialog} />
      )}
    </Box>
  );
};

export default React.memo(Group);
