import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Slide,
  Stack,
  Avatar,
  Typography,
  Box,
  IconButton,
  Chip,
  Divider,
  InputAdornment,
  TextField,
  Badge,
} from "@mui/material";
import { MagnifyingGlass, Phone, UserPlus, X, Funnel } from "phosphor-react";
import { useTheme } from "@mui/material/styles";
import { useDispatch, useSelector } from "react-redux";
import { FetchAllUsers } from "../../redux/slices/app";
import { faker } from "@faker-js/faker";
import { SimpleBarStyle } from "../../components/Scrollbar";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const StartCall = ({ open, handleClose }) => {
  const theme = useTheme();
  const { all_users } = useSelector((state) => state.app);
  const dispatch = useDispatch();

  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);

  useEffect(() => {
    dispatch(FetchAllUsers());
  }, [dispatch]);

  useEffect(() => {
    if (all_users.length > 0) {
      const filtered = all_users.filter((user) =>
        `${user?.firstName} ${user?.lastName}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [all_users, searchTerm]);

  const handleUserClick = (user) => {
    console.log("Starting call with:", user);
    // TODO: Implement start call logic
    handleClose();
  };

  const userList = filteredUsers.map((user) => ({
    id: user?._id,
    name: `${user?.firstName} ${user?.lastName}`,
    email: user?.email,
    image: faker.image.avatar(),
    status: Math.random() > 0.7 ? "online" : "offline",
    lastSeen: Math.random() > 0.5 ? "2h ago" : null,
  }));

  return (
    <Dialog
      fullWidth
      maxWidth="sm"
      open={open}
      TransitionComponent={Transition}
      keepMounted
      onClose={handleClose}
      sx={{
        "& .MuiDialog-paper": {
          borderRadius: 3,
          height: "80vh",
          background: theme.palette.background.paper,
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          p: 3,
          pb: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          background:
            theme.palette.mode === "light"
              ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              : "linear-gradient(135deg, #2c3e50 0%, #3498db 100%)",
          color: "white",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Phone size={24} weight="bold" />
            <Typography variant="h5" fontWeight="bold">
              Start New Call
            </Typography>
          </Stack>
          <IconButton
            onClick={handleClose}
            sx={{
              color: "white",
              "&:hover": {
                background: "rgba(255,255,255,0.1)",
              },
            }}
          >
            <X size={20} />
          </IconButton>
        </Stack>

        <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
          Select a contact to start audio call
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 0, height: "100%" }}>
        <Stack sx={{ height: "100%" }}>
          {/* Search Bar */}
          <Box sx={{ p: 2, pb: 1 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MagnifyingGlass
                      size={20}
                      color={theme.palette.text.secondary}
                    />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm("")}>
                      <X size={16} />
                    </IconButton>
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: 2,
                  background: theme.palette.background.default,
                },
              }}
            />

            {/* Filter Chips */}
            <Stack
              direction="row"
              spacing={1}
              sx={{ mt: 2, flexWrap: "wrap", gap: 1 }}
            >
              <Chip
                label="All Contacts"
                size="small"
                color="primary"
                variant="filled"
              />
              <Chip label="Online" size="small" variant="outlined" />
              <Chip label="Recent" size="small" variant="outlined" />
            </Stack>
          </Box>

          <Divider />

          {/* User List */}
          <Box sx={{ flexGrow: 1, overflow: "hidden" }}>
            <SimpleBarStyle style={{ height: "100%" }}>
              <Stack spacing={0.5} sx={{ p: 2 }}>
                {userList.length > 0 ? (
                  userList.map((user, index) => (
                    <Box key={user.id}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={2}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          cursor: "pointer",
                          transition: "all 0.2s",
                          "&:hover": {
                            background: theme.palette.action.hover,
                            transform: "translateY(-1px)",
                            boxShadow: theme.shadows[1],
                          },
                        }}
                        onClick={() => handleUserClick(user)}
                      >
                        {/* Avatar with Status */}
                        <Badge
                          color={
                            user.status === "online" ? "success" : "default"
                          }
                          variant="dot"
                          anchorOrigin={{
                            vertical: "bottom",
                            horizontal: "right",
                          }}
                          overlap="circular"
                        >
                          <Avatar
                            src={user.image}
                            sx={{
                              width: 50,
                              height: 50,
                              border: `2px solid ${theme.palette.background.paper}`,
                            }}
                          />
                        </Badge>

                        {/* User Info */}
                        <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography
                            variant="subtitle1"
                            fontWeight="600"
                            noWrap
                          >
                            {user.name}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            noWrap
                          >
                            {user.email}
                          </Typography>
                          {user.lastSeen && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Last seen {user.lastSeen}
                            </Typography>
                          )}
                        </Stack>

                        {/* Call Button */}
                        <IconButton
                          sx={{
                            background: theme.palette.primary.main,
                            color: "white",
                            "&:hover": {
                              background: theme.palette.primary.dark,
                              transform: "scale(1.1)",
                            },
                            transition: "all 0.2s",
                          }}
                        >
                          <Phone size={20} weight="bold" />
                        </IconButton>
                      </Stack>

                      {index < userList.length - 1 && (
                        <Divider sx={{ mx: 2 }} />
                      )}
                    </Box>
                  ))
                ) : (
                  /* Empty State */
                  <Stack
                    spacing={2}
                    alignItems="center"
                    justifyContent="center"
                    sx={{
                      height: 200,
                      textAlign: "center",
                    }}
                  >
                    <UserPlus size={48} color={theme.palette.text.secondary} />
                    <Typography variant="h6" color="text.secondary">
                      No contacts found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm
                        ? `No results for "${searchTerm}"`
                        : "Your contacts will appear here"}
                    </Typography>
                  </Stack>
                )}
              </Stack>
            </SimpleBarStyle>
          </Box>

          {/* Footer */}
          <Box
            sx={{
              p: 2,
              borderTop: `1px solid ${theme.palette.divider}`,
              background: theme.palette.background.default,
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              textAlign="center"
              display="block"
            >
              {userList.length} contacts • Tap to start audio call
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default StartCall;
