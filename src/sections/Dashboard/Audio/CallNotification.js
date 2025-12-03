import React, { useState, useEffect, useRef } from "react";
import {
  Avatar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Slide,
  Stack,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import {
  AcceptAudioCall,
  RejectAudioCall, // 🔴 FIX: Sử dụng đúng action
  UpdateAudioCallDialog,
  CloseAudioNotificationDialog,
} from "../../../redux/slices/audioCall"; // 🔴 FIX: Đường dẫn đúng
import { getSocket } from "../../../socket";
import { AWS_S3_REGION, S3_BUCKET_NAME } from "../../../config";
import { Phone, PhoneSlash, User } from "phosphor-react";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const CallNotification = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { call_queue } = useSelector((state) => state.audioCall);
  const [isLoading, setIsLoading] = useState(false);

  // 🔴 FIX: Ref để ngăn chặn xử lý nhiều lần
  const isProcessingRef = useRef(false);

  const call_details =
    call_queue && call_queue.length > 0 ? call_queue[0] : null;

  const handleAccept = async () => {
    // 🔴 FIX: Ngăn chặn click nhiều lần
    if (isProcessingRef.current || !call_details) return;

    isProcessingRef.current = true;
    setIsLoading(true);

    try {
      console.log("✅ [NOTIFICATION] Accepting audio call:", call_details);

      // 🔴 FIX: Thêm socket emit accept call
      const socket = getSocket();
      if (socket && socket.connected && call_details.roomID) {
        socket.emit("audio_call_accepted", {
          roomID: call_details.roomID,
          callId: call_details.id || call_details.callId,
        });
      }

      // Dispatch accept action
      dispatch(AcceptAudioCall());

      // Đóng notification dialog
      dispatch(CloseAudioNotificationDialog());

      // Mở audio call dialog
      dispatch(UpdateAudioCallDialog({ state: true }));

      // Gọi onClose callback
      if (onClose && typeof onClose === "function") {
        onClose();
      }

      console.log("✅ Call accepted successfully");
    } catch (error) {
      console.error("❌ Error accepting call:", error);

      // 🔴 FIX: Show error to user
      dispatch(CloseAudioNotificationDialog());
    } finally {
      setIsLoading(false);
      isProcessingRef.current = false;
    }
  };

  const handleDeny = () => {
    if (isProcessingRef.current || !call_details) return;

    isProcessingRef.current = true;

    console.log("❌ [NOTIFICATION] Denying audio call:", call_details);

    // Send deny event via socket
    const socket = getSocket();
    if (socket && socket.connected && call_details.roomID) {
      socket.emit("audio_call_declined", {
        roomID: call_details.roomID,
        callId: call_details.id || call_details.callId,
      });
    }

    // 🔴 FIX: Sử dụng RejectAudioCall thay vì resetAudioCallQueue
    dispatch(RejectAudioCall());

    // Close notification
    if (onClose && typeof onClose === "function") {
      onClose();
    }

    // Close notification dialog
    dispatch(CloseAudioNotificationDialog());

    isProcessingRef.current = false;
  };

  // Handle notification close
  const handleDialogClose = (event, reason) => {
    if (reason === "backdropClick" || reason === "escapeKeyDown") {
      handleDeny();
    }
  };

  // Auto-close if no call details
  useEffect(() => {
    if (!call_details && open) {
      console.log("⚠️ No call details, closing notification");
      if (onClose && typeof onClose === "function") {
        onClose();
      }
    }
  }, [call_details, open, onClose]);

  if (!call_details) return null;

  // Lấy thông tin người gọi
  const callerName =
    call_details.fromUser?.username ||
    call_details.fromUser?.firstName ||
    call_details.fromUser?.name ||
    "Unknown Caller";

  const callerAvatar = call_details.fromUser?.avatar;

  return (
    <Dialog
      open={open}
      TransitionComponent={Transition}
      keepMounted
      onClose={handleDialogClose}
      aria-describedby="alert-dialog-slide-description"
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxWidth: 400,
          width: "100%",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          overflow: "hidden",
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Stack spacing={3} alignItems="center" p={3}>
          {/* Caller Avatar với hiệu ứng */}
          <Box sx={{ position: "relative", width: 120, height: 120 }}>
            <Avatar
              sx={{
                height: 100,
                width: 100,
                border: "3px solid white",
                backgroundColor: "rgba(255,255,255,0.2)",
                position: "relative",
                zIndex: 2,
              }}
              src={
                callerAvatar
                  ? `https://${S3_BUCKET_NAME}.s3.${AWS_S3_REGION}.amazonaws.com/${callerAvatar}`
                  : undefined
              }
            >
              <User size={40} color="white" />
            </Avatar>

            {/* Hiệu ứng sóng */}
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.3)",
                animation: "ripple 1.5s infinite",
                zIndex: 1,
              }}
            />
            <Box
              sx={{
                position: "absolute",
                top: -10,
                left: -10,
                right: -10,
                bottom: -10,
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.2)",
                animation: "ripple 1.5s infinite",
                animationDelay: "0.5s",
                zIndex: 1,
              }}
            />
          </Box>

          {/* Call Info */}
          <Box textAlign="center">
            <Typography variant="h6" fontWeight="bold" color="white">
              {callerName}
            </Typography>
            <Typography
              variant="body1"
              color="rgba(255,255,255,0.9)"
              sx={{ mt: 0.5 }}
            >
              Audio Call
            </Typography>
            <Typography
              variant="body2"
              color="rgba(255,255,255,0.7)"
              sx={{ mt: 1 }}
            >
              Incoming call...
            </Typography>
          </Box>

          {/* Action Buttons */}
          <Stack direction="row" spacing={2} sx={{ width: "100%", mt: 2 }}>
            <Button
              onClick={handleDeny}
              variant="contained"
              color="error"
              fullWidth
              startIcon={<PhoneSlash size={20} />}
              sx={{
                py: 1.5,
                borderRadius: 2,
                fontWeight: "bold",
                boxShadow: "0 3px 10px rgba(0,0,0,0.2)",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 5px 15px rgba(0,0,0,0.3)",
                },
                transition: "all 0.2s ease",
              }}
              disabled={isLoading}
            >
              Decline
            </Button>

            <Button
              onClick={handleAccept}
              variant="contained"
              color="success"
              fullWidth
              startIcon={
                isLoading ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <Phone size={20} />
                )
              }
              sx={{
                py: 1.5,
                borderRadius: 2,
                fontWeight: "bold",
                boxShadow: "0 3px 10px rgba(0,0,0,0.2)",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 5px 15px rgba(0,0,0,0.3)",
                },
                transition: "all 0.2s ease",
              }}
              disabled={isLoading}
            >
              {isLoading ? "Answering..." : "Answer"}
            </Button>
          </Stack>
        </Stack>
      </DialogContent>

      {/* CSS cho hiệu ứng */}
      <style jsx="true">{`
        @keyframes ripple {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          70% {
            transform: scale(1.3);
            opacity: 0;
          }
          100% {
            transform: scale(1.3);
            opacity: 0;
          }
        }
      `}</style>
    </Dialog>
  );
};

export default CallNotification;
