import React, { memo, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Stack,
  Box,
  Typography,
  Menu,
  MenuItem,
  IconButton,
  Divider,
  Snackbar,
  Alert,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { DotsThreeVertical, DownloadSimple, Image } from "phosphor-react";
import { Message_options } from "../../data";
import Embed from "react-embed";
import { ReplyInfo } from "../../components/Chat/ReplyComponents";
import { deleteMessageThunk } from "../../redux/slices/conversation";
import { socket } from "../../socket";
import { showSnackbar } from "../../redux/slices/app";

// 🆕 THÊM: Hook để quản lý pin/unpin messages
// Trong usePinMessage hook - SỬA LẠI
// 🆕 SỬA: Hook usePinMessage hoàn chỉnh
const usePinMessage = () => {
  const dispatch = useDispatch();
  const { chat_type, room_id } = useSelector((state) => state.app);
  const { pinned_messages: directPinned = [] } = useSelector(
    (state) => state.conversation.direct_chat
  );
  const { pinned_messages: groupPinned = [] } = useSelector(
    (state) => state.conversation.group_chat
  );

  const pinnedMessages = chat_type === "group" ? groupPinned : directPinned;

  const pinMessage = useCallback(
    (messageId) => {
      if (window.socket) {
        console.log("📌 Attempting to pin message:", {
          messageId,
          room_id,
          chat_type,
        });

        // 🆕 SỬA: Dùng đúng socket event names
        const socketEvent =
          chat_type === "group" ? "pin_group_message" : "pin_direct_message";

        const socketData =
          chat_type === "group"
            ? { messageId, roomId: room_id }
            : { messageId };

        window.socket.emit(socketEvent, socketData, (response) => {
          console.log("📌 Pin message response:", response);
          if (response.status === "success") {
            dispatch(
              showSnackbar({
                severity: "success",
                message: "Message pinned successfully",
              })
            );
          } else {
            dispatch(
              showSnackbar({
                severity: "error",
                message: response.message || "Failed to pin message",
              })
            );
          }
        });
      } else {
        console.error("❌ Socket not available");
        dispatch(
          showSnackbar({
            severity: "error",
            message: "Socket connection not available",
          })
        );
      }
    },
    [chat_type, room_id, dispatch]
  );

  const unpinMessage = useCallback(
    (messageId) => {
      if (window.socket) {
        console.log("📌 Attempting to unpin message:", {
          messageId,
          room_id,
          chat_type,
        });

        const socketEvent =
          chat_type === "group"
            ? "unpin_group_message"
            : "unpin_direct_message";

        const socketData =
          chat_type === "group"
            ? { messageId, roomId: room_id }
            : { messageId };

        window.socket.emit(socketEvent, socketData, (response) => {
          console.log("📌 Unpin message response:", response);
          if (response.status === "success") {
            dispatch(
              showSnackbar({
                severity: "success",
                message: "Message unpinned",
              })
            );
          } else {
            dispatch(
              showSnackbar({
                severity: "error",
                message: response.message || "Failed to unpin message",
              })
            );
          }
        });
      } else {
        console.error("❌ Socket not available");
        dispatch(
          showSnackbar({
            severity: "error",
            message: "Socket connection not available",
          })
        );
      }
    },
    [chat_type, room_id, dispatch]
  );

  // 🆕 THÊM: Hàm kiểm tra tin nhắn đã được ghim
  const isMessagePinned = useCallback(
    (messageId) => {
      return pinnedMessages.some((msg) => msg.id === messageId);
    },
    [pinnedMessages]
  );

  return {
    pinMessage,
    unpinMessage,
    isMessagePinned, // 🆕 THÊM hàm này
    pinnedMessages,
  };
};

// 🆕 THÊM: Hook để quản lý snackbar
const useMessageSnackbar = () => {
  const [snackbar, setSnackbar] = React.useState({
    open: false,
    message: "",
    severity: "success",
  });

  const showSnackbar = useCallback((message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const hideSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  return { snackbar, showSnackbar, hideSnackbar };
};

// =======================
//  MESSAGE OPTION MENU - HOÀN CHỈNH VỚI PIN/UNPIN
// =======================
const MessageOption = memo(({ onAction, messageId }) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const buttonRef = useRef(null);
  const { isMessagePinned } = usePinMessage();

  const isPinned = isMessagePinned(messageId);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    setAnchorEl(e.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
    setTimeout(() => {
      if (buttonRef.current) {
        buttonRef.current.focus();
      }
    }, 100);
  }, []);

  const handleMenuItemClick = useCallback(
    (action) => {
      handleClose();
      if (action && onAction) {
        onAction(action);
      }
    },
    [handleClose, onAction]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        handleClose();
      }
    },
    [handleClose]
  );

  // 🆕 CẬP NHẬT: Message options với pin/unpin dynamic
  const getMessageOptions = useCallback(() => {
    const baseOptions = Message_options.filter(
      (opt) => opt.action !== "pin" && opt.action !== "unpin"
    );

    if (isPinned) {
      return [
        ...baseOptions,
        {
          id: "unpin",
          title: "Unpin Message",
          action: "unpin",
        },
      ];
    } else {
      return [
        ...baseOptions,
        {
          id: "pin",
          title: "Pin Message",
          action: "pin",
        },
      ];
    }
  }, [isPinned]);

  const messageOptions = getMessageOptions();

  return (
    <>
      <IconButton
        ref={buttonRef}
        size="small"
        onClick={handleClick}
        sx={{
          opacity: 0,
          transition: "opacity 0.2s ease",
          "&:hover, &:focus": {
            opacity: 1,
          },
        }}
      >
        <DotsThreeVertical size={20} />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        disableAutoFocusItem={true}
        disableEnforceFocus={false}
        disableRestoreFocus={false}
        keepMounted={false}
        transitionDuration={200}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        sx={{
          "& .MuiPaper-root": {
            pointerEvents: "auto",
          },
        }}
      >
        <Stack spacing={1} px={1}>
          {messageOptions.map((el) => (
            <MenuItem
              key={el.id}
              onClick={() => handleMenuItemClick(el.action)}
              autoFocus={false}
              sx={
                el.action === "delete"
                  ? {
                      color: "error.main",
                      "&:hover": {
                        backgroundColor: "error.light",
                        color: "error.contrastText",
                      },
                    }
                  : el.action === "pin" || el.action === "unpin"
                  ? {
                      color: "warning.main",
                      "&:hover": {
                        backgroundColor: "warning.light",
                        color: "warning.contrastText",
                      },
                    }
                  : {}
              }
            >
              {el.title}
            </MenuItem>
          ))}
        </Stack>
      </Menu>
    </>
  );
});

// =======================
//  MESSAGE CONTAINER - HOÀN CHỈNH VỚI roomId
// =======================
const MessageContainer = memo(
  ({
    children,
    el,
    menu,
    onMenuAction,
    onDelete,
    isGroup = false,
    roomId = null,
  }) => {
    const [showMenu, setShowMenu] = React.useState(false);

    const handleMouseEnter = useCallback(() => {
      setShowMenu(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
      setShowMenu(false);
    }, []);

    const handleMenuAction = useCallback(
      (action) => {
        if (action === "delete" && onDelete) {
          // 🆕 TRUYỀN roomId CHO onDelete
          onDelete(el, isGroup, roomId);
        } else if (onMenuAction) {
          onMenuAction(action, el);
        }
      },
      [el, onMenuAction, onDelete, isGroup, roomId] // 🆕 THÊM roomId
    );

    const handleContainerClick = useCallback((e) => {
      e.stopPropagation();
    }, []);

    return (
      <Stack
        direction="row"
        justifyContent={el.incoming ? "start" : "end"}
        alignItems="flex-start"
        gap={1}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleContainerClick}
        sx={{
          "&:hover .message-actions": {
            opacity: 1,
          },
        }}
      >
        {menu && el.outgoing && (
          <Box
            className="message-actions"
            sx={{
              opacity: showMenu ? 1 : 0,
              transition: "opacity 0.2s ease",
              minWidth: "32px",
            }}
          >
            <MessageOption
              onAction={handleMenuAction}
              messageId={el.id || el._id}
            />
          </Box>
        )}

        {children}

        {menu && !el.outgoing && (
          <Box
            className="message-actions"
            sx={{
              opacity: showMenu ? 1 : 0,
              transition: "opacity 0.2s ease",
              minWidth: "32px",
            }}
          >
            <MessageOption
              onAction={handleMenuAction}
              messageId={el.id || el._id}
            />
          </Box>
        )}
      </Stack>
    );
  }
);

// =======================
//  TEXT MESSAGE - HOÀN CHỈNH VỚI DELETE, PIN VÀ roomId
// =======================
const TextMsg = memo(
  ({ el, menu, onDelete, isGroup = false, roomId = null }) => {
    const theme = useTheme();
    const { snackbar, showSnackbar, hideSnackbar } = useMessageSnackbar();
    const dispatch = useDispatch();
    const { pinMessage, unpinMessage } = usePinMessage();

    const handleMenuAction = useCallback(
      (action, messageEl) => {
        const messageId = messageEl.id || messageEl._id;

        switch (action) {
          case "reply":
            if (window.setMessageReply) {
              window.setMessageReply({
                id: messageId,
                content: messageEl.message || messageEl.content,
                sender: messageEl.sender,
                type: messageEl.subtype || "text",
              });
            }
            break;
          case "pin":
            pinMessage(messageId);
            break;
          case "unpin":
            unpinMessage(messageId);
            break;
          case "forward":
            showSnackbar("Message forwarded", "info");
            break;
          default:
            break;
        }
      },
      [pinMessage, unpinMessage, showSnackbar]
    );

    // 🆕 HANDLER XÓA TIN NHẮN - TRUYỀN roomId CHO GROUP
    const handleDelete = useCallback(
      (messageEl, messageIsGroup = false, messageRoomId = null) => {
        console.log("🗑️ Deleting message:", {
          messageId: messageEl.id || messageEl._id,
          isGroup: messageIsGroup,
          roomId: messageRoomId, // 🆕 SỬ DỤNG roomId TRUYỀN VÀO
        });

        // Gọi thunk để xóa tin nhắn - TRUYỀN roomId CHO GROUP
        dispatch(
          deleteMessageThunk(
            messageEl.id || messageEl._id,
            messageIsGroup,
            messageRoomId, // 🆕 TRUYỀN roomId
            socket
          )
        );

        showSnackbar("Message deleted", "success");
      },
      [dispatch, showSnackbar]
    );

    const handleReplyClick = useCallback(() => {
      if (el.replyTo && window.setMessageReply) {
        // Handle reply click
      }
    }, [el.replyTo]);

    return (
      <>
        <MessageContainer
          el={el}
          menu={menu}
          onMenuAction={handleMenuAction}
          onDelete={handleDelete}
          isGroup={isGroup}
          roomId={roomId} // 🆕 TRUYỀN roomId CHO CONTAINER
        >
          <Box
            px={1.5}
            py={1.5}
            sx={{
              backgroundColor: el.incoming
                ? alpha(theme.palette.background.default, 1)
                : theme.palette.primary.main,
              borderRadius: 1.5,
              width: "max-content",
              maxWidth: "400px",
            }}
          >
            {el.replyTo && (
              <ReplyInfo replyTo={el.replyTo} onClick={handleReplyClick} />
            )}

            <Typography
              variant="body2"
              color={el.incoming ? theme.palette.text : "#fff"}
              sx={{ wordBreak: "break-word" }}
            >
              {el.message || el.content}
            </Typography>

            <Typography
              variant="caption"
              sx={{
                display: "block",
                textAlign: el.incoming ? "left" : "right",
                color: el.incoming
                  ? theme.palette.text.secondary
                  : "rgba(255,255,255,0.7)",
                marginTop: 0.5,
                fontSize: "0.7rem",
              }}
            >
              {el.time}
            </Typography>
          </Box>
        </MessageContainer>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={hideSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        >
          <Alert onClose={hideSnackbar} severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </>
    );
  }
);

// =======================
//  MEDIA MESSAGE - HOÀN CHỈNH VỚI DELETE, PIN VÀ roomId
// =======================
const MediaMsg = memo(
  ({ el, menu, onDelete, isGroup = false, roomId = null }) => {
    const theme = useTheme();
    const { snackbar, showSnackbar, hideSnackbar } = useMessageSnackbar();
    const dispatch = useDispatch();
    const { pinMessage, unpinMessage } = usePinMessage();

    const handleMenuAction = useCallback(
      (action, messageEl) => {
        const messageId = messageEl.id || messageEl._id;

        switch (action) {
          case "reply":
            if (window.setMessageReply) {
              window.setMessageReply({
                id: messageId,
                content: messageEl.message || "📷 Media",
                sender: messageEl.sender,
                type: "img",
              });
            }
            break;
          case "pin":
            pinMessage(messageId);
            break;
          case "unpin":
            unpinMessage(messageId);
            break;
          case "download":
            showSnackbar("Media downloaded", "info");
            break;
          case "forward":
            showSnackbar("Media forwarded", "info");
            break;
          default:
            break;
        }
      },
      [pinMessage, unpinMessage, showSnackbar]
    );

    // 🆕 HANDLER XÓA TIN NHẮN - TRUYỀN roomId CHO GROUP
    const handleDelete = useCallback(
      (messageEl, messageIsGroup = false, messageRoomId = null) => {
        console.log("🗑️ Deleting media message:", {
          messageId: messageEl.id || messageEl._id,
          isGroup: messageIsGroup,
          roomId: messageRoomId,
        });

        dispatch(
          deleteMessageThunk(
            messageEl.id || messageEl._id,
            messageIsGroup,
            messageRoomId, // 🆕 TRUYỀN roomId
            socket
          )
        );
        showSnackbar("Media message deleted", "success");
      },
      [dispatch, showSnackbar]
    );

    const handleReplyClick = useCallback(() => {
      if (el.replyTo && window.setMessageReply) {
        // Handle reply click
      }
    }, [el.replyTo]);

    return (
      <>
        <MessageContainer
          el={el}
          menu={menu}
          onMenuAction={handleMenuAction}
          onDelete={handleDelete}
          isGroup={isGroup}
          roomId={roomId} // 🆕 TRUYỀN roomId CHO CONTAINER
        >
          <Box
            px={1.5}
            py={1.5}
            sx={{
              backgroundColor: el.incoming
                ? alpha(theme.palette.background.default, 1)
                : theme.palette.primary.main,
              borderRadius: 1.5,
              width: "max-content",
            }}
          >
            {el.replyTo && (
              <ReplyInfo replyTo={el.replyTo} onClick={handleReplyClick} />
            )}

            <Stack spacing={1}>
              <img
                src={el.img}
                alt={el.message}
                style={{
                  maxHeight: 210,
                  borderRadius: "10px",
                  maxWidth: "300px",
                }}
                loading="lazy"
              />
              {el.message && (
                <Typography
                  variant="body2"
                  color={el.incoming ? theme.palette.text : "#fff"}
                >
                  {el.message}
                </Typography>
              )}

              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  textAlign: el.incoming ? "left" : "right",
                  color: el.incoming
                    ? theme.palette.text.secondary
                    : "rgba(255,255,255,0.7)",
                  fontSize: "0.7rem",
                }}
              >
                {el.time}
              </Typography>
            </Stack>
          </Box>
        </MessageContainer>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={hideSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        >
          <Alert onClose={hideSnackbar} severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </>
    );
  }
);

// =======================
//  DOCUMENT MESSAGE - HOÀN CHỈNH VỚI DELETE, PIN VÀ roomId
// =======================
const DocMsg = memo(
  ({ el, menu, onDelete, isGroup = false, roomId = null }) => {
    const theme = useTheme();
    const { snackbar, showSnackbar, hideSnackbar } = useMessageSnackbar();
    const dispatch = useDispatch();
    const { pinMessage, unpinMessage } = usePinMessage();

    const handleMenuAction = useCallback(
      (action, messageEl) => {
        const messageId = messageEl.id || messageEl._id;

        switch (action) {
          case "reply":
            if (window.setMessageReply) {
              window.setMessageReply({
                id: messageId,
                content: messageEl.message || "📄 Document",
                sender: messageEl.sender,
                type: "doc",
              });
            }
            break;
          case "pin":
            pinMessage(messageId);
            break;
          case "unpin":
            unpinMessage(messageId);
            break;
          case "download":
            showSnackbar("Document downloaded", "info");
            break;
          case "forward":
            showSnackbar("Document forwarded", "info");
            break;
          default:
            break;
        }
      },
      [pinMessage, unpinMessage, showSnackbar]
    );

    // 🆕 HANDLER XÓA TIN NHẮN - TRUYỀN roomId CHO GROUP
    const handleDelete = useCallback(
      (messageEl, messageIsGroup = false, messageRoomId = null) => {
        console.log("🗑️ Deleting document message:", {
          messageId: messageEl.id || messageEl._id,
          isGroup: messageIsGroup,
          roomId: messageRoomId,
        });

        dispatch(
          deleteMessageThunk(
            messageEl.id || messageEl._id,
            messageIsGroup,
            messageRoomId, // 🆕 TRUYỀN roomId
            socket
          )
        );
        showSnackbar("Document message deleted", "success");
      },
      [dispatch, showSnackbar]
    );

    const handleReplyClick = useCallback(() => {
      if (el.replyTo && window.setMessageReply) {
        // Handle reply click
      }
    }, [el.replyTo]);

    return (
      <>
        <MessageContainer
          el={el}
          menu={menu}
          onMenuAction={handleMenuAction}
          onDelete={handleDelete}
          isGroup={isGroup}
          roomId={roomId} // 🆕 TRUYỀN roomId CHO CONTAINER
        >
          <Box
            px={1.5}
            py={1.5}
            sx={{
              backgroundColor: el.incoming
                ? alpha(theme.palette.background.default, 1)
                : theme.palette.primary.main,
              borderRadius: 1.5,
              width: "max-content",
            }}
          >
            {el.replyTo && (
              <ReplyInfo replyTo={el.replyTo} onClick={handleReplyClick} />
            )}

            <Stack spacing={2}>
              <Stack
                p={2}
                direction="row"
                spacing={3}
                alignItems="center"
                sx={{
                  backgroundColor: theme.palette.background.paper,
                  borderRadius: 1,
                }}
              >
                <Image size={48} />
                <Typography variant="caption">Abstract.png</Typography>
                <IconButton>
                  <DownloadSimple />
                </IconButton>
              </Stack>
              {el.message && (
                <Typography
                  variant="body2"
                  color={el.incoming ? theme.palette.text : "#fff"}
                >
                  {el.message}
                </Typography>
              )}

              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  textAlign: el.incoming ? "left" : "right",
                  color: el.incoming
                    ? theme.palette.text.secondary
                    : "rgba(255,255,255,0.7)",
                  fontSize: "0.7rem",
                }}
              >
                {el.time}
              </Typography>
            </Stack>
          </Box>
        </MessageContainer>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={hideSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        >
          <Alert onClose={hideSnackbar} severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </>
    );
  }
);

// =======================
//  LINK MESSAGE - HOÀN CHỈNH VỚI DELETE, PIN VÀ roomId
// =======================
const LinkMsg = memo(
  ({ el, menu, onDelete, isGroup = false, roomId = null }) => {
    const theme = useTheme();
    const { snackbar, showSnackbar, hideSnackbar } = useMessageSnackbar();
    const dispatch = useDispatch();
    const { pinMessage, unpinMessage } = usePinMessage();

    const handleMenuAction = useCallback(
      (action, messageEl) => {
        const messageId = messageEl.id || messageEl._id;

        switch (action) {
          case "reply":
            if (window.setMessageReply) {
              window.setMessageReply({
                id: messageId,
                content: messageEl.message || "🔗 Link",
                sender: messageEl.sender,
                type: "Link",
              });
            }
            break;
          case "pin":
            pinMessage(messageId);
            break;
          case "unpin":
            unpinMessage(messageId);
            break;
          case "copy":
            showSnackbar("Link copied to clipboard", "info");
            break;
          case "forward":
            showSnackbar("Link forwarded", "info");
            break;
          default:
            break;
        }
      },
      [pinMessage, unpinMessage, showSnackbar]
    );

    // 🆕 HANDLER XÓA TIN NHẮN - TRUYỀN roomId CHO GROUP
    const handleDelete = useCallback(
      (messageEl, messageIsGroup = false, messageRoomId = null) => {
        console.log("🗑️ Deleting link message:", {
          messageId: messageEl.id || messageEl._id,
          isGroup: messageIsGroup,
          roomId: messageRoomId,
        });

        dispatch(
          deleteMessageThunk(
            messageEl.id || messageEl._id,
            messageIsGroup,
            messageRoomId, // 🆕 TRUYỀN roomId
            socket
          )
        );
        showSnackbar("Link message deleted", "success");
      },
      [dispatch, showSnackbar]
    );

    const handleReplyClick = useCallback(() => {
      if (el.replyTo && window.setMessageReply) {
        // Handle reply click
      }
    }, [el.replyTo]);

    return (
      <>
        <MessageContainer
          el={el}
          menu={menu}
          onMenuAction={handleMenuAction}
          onDelete={handleDelete}
          isGroup={isGroup}
          roomId={roomId} // 🆕 TRUYỀN roomId CHO CONTAINER
        >
          <Box
            px={1.5}
            py={1.5}
            sx={{
              backgroundColor: el.incoming
                ? alpha(theme.palette.background.default, 1)
                : theme.palette.primary.main,
              borderRadius: 1.5,
              width: "max-content",
            }}
          >
            {el.replyTo && (
              <ReplyInfo replyTo={el.replyTo} onClick={handleReplyClick} />
            )}

            <Stack spacing={2}>
              <Stack
                p={2}
                direction="column"
                spacing={3}
                sx={{
                  backgroundColor: theme.palette.background.paper,
                  borderRadius: 1,
                }}
              >
                <Embed
                  width="300px"
                  isDark
                  url={`https://youtu.be/xoWxBR34qLE`}
                />
              </Stack>

              {el.message && (
                <Typography
                  variant="body2"
                  color={el.incoming ? theme.palette.text : "#fff"}
                >
                  <div dangerouslySetInnerHTML={{ __html: el.message }} />
                </Typography>
              )}

              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  textAlign: el.incoming ? "left" : "right",
                  color: el.incoming
                    ? theme.palette.text.secondary
                    : "rgba(255,255,255,0.7)",
                  fontSize: "0.7rem",
                }}
              >
                {el.time}
              </Typography>
            </Stack>
          </Box>
        </MessageContainer>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={hideSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        >
          <Alert onClose={hideSnackbar} severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </>
    );
  }
);

// =======================
//  REPLY MESSAGE - HOÀN CHỈNH VỚI DELETE, PIN VÀ roomId
// =======================
const ReplyMsg = memo(
  ({ el, menu, onDelete, isGroup = false, roomId = null }) => {
    const theme = useTheme();
    const { snackbar, showSnackbar, hideSnackbar } = useMessageSnackbar();
    const dispatch = useDispatch();
    const { pinMessage, unpinMessage } = usePinMessage();

    const handleMenuAction = useCallback(
      (action, messageEl) => {
        const messageId = messageEl.id || messageEl._id;

        switch (action) {
          case "reply":
            if (window.setMessageReply) {
              window.setMessageReply({
                id: messageId,
                content: messageEl.content || messageEl.message,
                sender: messageEl.sender,
                type: "reply",
              });
            }
            break;
          case "pin":
            pinMessage(messageId);
            break;
          case "unpin":
            unpinMessage(messageId);
            break;
          case "forward":
            showSnackbar("Message forwarded", "info");
            break;
          default:
            break;
        }
      },
      [pinMessage, unpinMessage, showSnackbar]
    );

    // 🆕 HANDLER XÓA TIN NHẮN - TRUYỀN roomId CHO GROUP
    const handleDelete = useCallback(
      (messageEl, messageIsGroup = false, messageRoomId = null) => {
        console.log("🗑️ Deleting reply message:", {
          messageId: messageEl.id || messageEl._id,
          isGroup: messageIsGroup,
          roomId: messageRoomId,
        });

        dispatch(
          deleteMessageThunk(
            messageEl.id || messageEl._id,
            messageIsGroup,
            messageRoomId, // 🆕 TRUYỀN roomId
            socket
          )
        );
        showSnackbar("Reply message deleted", "success");
      },
      [dispatch, showSnackbar]
    );

    const handleReplyClick = useCallback(() => {
      if (el.replyTo && window.setMessageReply) {
        // Handle reply click
      }
    }, [el.replyTo]);

    // Hàm xử lý dữ liệu reply an toàn
    const getReplyData = () => {
      if (!el.replyTo) {
        return null;
      }

      const replyTo = el.replyTo;

      if (typeof replyTo === "string") {
        return null;
      }

      if (!replyTo.content && !replyTo.message) {
        return null;
      }

      return replyTo;
    };

    const replyData = getReplyData();
    const isOwnMessage = el.outgoing;

    const getOriginalSenderName = () => {
      if (!replyData?.sender) return "Unknown";

      if (typeof replyData.sender === "string") {
        return "User";
      }

      const senderName = replyData.sender.name || replyData.sender.username;

      if (replyData.sender.keycloakId && el.sender?.keycloakId) {
        if (replyData.sender.keycloakId === el.sender.keycloakId) {
          return "You";
        }
      }

      return senderName || "Unknown";
    };

    const getOriginalContent = () => {
      return replyData?.content || replyData?.message || "No content";
    };

    if (!replyData) {
      return (
        <>
          <MessageContainer
            el={el}
            menu={menu}
            onMenuAction={handleMenuAction}
            onDelete={handleDelete}
            isGroup={isGroup}
            roomId={roomId} // 🆕 TRUYỀN roomId CHO CONTAINER
          >
            <Box
              px={1.5}
              py={1.5}
              sx={{
                backgroundColor: isOwnMessage
                  ? theme.palette.primary.main
                  : alpha(theme.palette.background.paper, 1),
                borderRadius: 1.5,
                width: "max-content",
                maxWidth: "400px",
              }}
            >
              <Typography
                variant="body2"
                color={isOwnMessage ? "#fff" : theme.palette.text.primary}
                sx={{ wordBreak: "break-word" }}
              >
                {el.content || el.message}
              </Typography>

              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  textAlign: isOwnMessage ? "right" : "left",
                  color: isOwnMessage
                    ? "rgba(255,255,255,0.7)"
                    : theme.palette.text.secondary,
                  marginTop: 0.5,
                  fontSize: "0.7rem",
                }}
              >
                {el.time}
              </Typography>
            </Box>
          </MessageContainer>

          <Snackbar
            open={snackbar.open}
            autoHideDuration={3000}
            onClose={hideSnackbar}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          >
            <Alert onClose={hideSnackbar} severity={snackbar.severity}>
              {snackbar.message}
            </Alert>
          </Snackbar>
        </>
      );
    }

    return (
      <>
        <MessageContainer
          el={el}
          menu={menu}
          onMenuAction={handleMenuAction}
          onDelete={handleDelete}
          isGroup={isGroup}
          roomId={roomId} // 🆕 TRUYỀN roomId CHO CONTAINER
        >
          <Box
            px={1.5}
            py={1.5}
            sx={{
              backgroundColor: isOwnMessage
                ? theme.palette.primary.main
                : alpha(theme.palette.background.paper, 1),
              borderRadius: 1.5,
              width: "max-content",
              maxWidth: "400px",
            }}
          >
            {/* REPLY PREVIEW SECTION */}
            <Box
              sx={{
                padding: 1,
                backgroundColor: isOwnMessage
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(0,0,0,0.05)",
                borderRadius: 0.5,
                marginBottom: 1,
                borderLeft: `3px solid ${
                  isOwnMessage
                    ? "rgba(255,255,255,0.5)"
                    : theme.palette.primary.main
                }`,
                cursor: "pointer",
                "&:hover": {
                  backgroundColor: isOwnMessage
                    ? "rgba(255,255,255,0.3)"
                    : "rgba(0,0,0,0.08)",
                },
              }}
              onClick={handleReplyClick}
            >
              <Stack spacing={0.5}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    color: isOwnMessage
                      ? "rgba(255,255,255,0.9)"
                      : theme.palette.primary.main,
                    fontSize: "0.7rem",
                  }}
                >
                  {getOriginalSenderName()}
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    color: isOwnMessage
                      ? "rgba(255,255,255,0.8)"
                      : theme.palette.text.secondary,
                    fontSize: "0.8rem",
                    lineHeight: 1.2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {getOriginalContent()}
                </Typography>
              </Stack>
            </Box>

            {/* NỘI DUNG REPLY HIỆN TẠI */}
            <Typography
              variant="body2"
              sx={{
                color: isOwnMessage ? "#fff" : theme.palette.text.primary,
                wordBreak: "break-word",
              }}
            >
              {el.content || el.message}
            </Typography>

            {/* THỜI GIAN */}
            <Typography
              variant="caption"
              sx={{
                display: "block",
                textAlign: isOwnMessage ? "right" : "left",
                color: isOwnMessage
                  ? "rgba(255,255,255,0.7)"
                  : theme.palette.text.secondary,
                marginTop: 0.5,
                fontSize: "0.7rem",
              }}
            >
              {el.time}
            </Typography>
          </Box>
        </MessageContainer>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={hideSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        >
          <Alert onClose={hideSnackbar} severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </>
    );
  }
);

// =======================
//  TIMELINE
// =======================
const Timeline = memo(({ el }) => {
  const theme = useTheme();

  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between">
      <Divider width="46%" />
      <Typography variant="caption" sx={{ color: theme.palette.text }}>
        {el.text}
      </Typography>
      <Divider width="46%" />
    </Stack>
  );
});

export { Timeline, MediaMsg, LinkMsg, DocMsg, TextMsg, ReplyMsg };
