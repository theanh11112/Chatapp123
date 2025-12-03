// frontend/src/sections/dashboard/Video/CallNotification.js
import React, { useState, useCallback } from "react";
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
  ResetVideoCallQueue,
  UpdateVideoCallDialog,
  PushToVideoCallQueue,
  CloseVideoNotificationDialog,
} from "../../../redux/slices/videoCall";
import { acceptSocketCall, declineSocketCall } from "../../../socket";
import { VideoCamera, PhoneSlash, User } from "phosphor-react";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const CallNotification = ({ open, handleClose }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { call_queue } = useSelector((state) => state.videoCall);
  const [isLoading, setIsLoading] = useState(false);

  // Get the latest call from queue
  const call_details =
    call_queue.length > 0 ? call_queue[call_queue.length - 1] : null;

  const handleAccept = useCallback(async () => {
    if (!call_details || !user) return;

    try {
      setIsLoading(true);
      console.log("✅ Accepting video call:", call_details);

      // Send accept event via socket
      const success = await acceptSocketCall(
        call_details.callId,
        call_details.roomID
      );

      if (success) {
        // Update call status in queue
        dispatch(
          PushToVideoCallQueue({
            ...call_details,
            accepted: true,
            incoming: true,
            status: "accepted",
          })
        );

        // Open video dialog
        dispatch(UpdateVideoCallDialog(true));

        // Close notification
        dispatch(CloseVideoNotificationDialog());

        if (handleClose) handleClose();
      } else {
        throw new Error("Failed to accept call");
      }
    } catch (error) {
      console.error("❌ Error accepting call:", error);
    } finally {
      setIsLoading(false);
    }
  }, [call_details, user, dispatch, handleClose]);

  const handleDeny = useCallback(async () => {
    if (!call_details) return;

    console.log("❌ Denying video call:", call_details);

    try {
      // Send deny event via socket
      await declineSocketCall(call_details.callId, call_details.roomID);

      // Reset call queue
      dispatch(ResetVideoCallQueue());

      // Close notification
      dispatch(CloseVideoNotificationDialog());

      if (handleClose) handleClose();
    } catch (error) {
      console.error("❌ Error denying call:", error);
    }
  }, [call_details, dispatch, handleClose]);

  // Handle notification close
  const handleDialogClose = useCallback(
    (event, reason) => {
      if (reason === "backdropClick" || reason === "escapeKeyDown") {
        handleDeny();
      }
    },
    [handleDeny]
  );

  // Auto close after 30 seconds
  React.useEffect(() => {
    if (open && call_details) {
      const timeout = setTimeout(() => {
        console.log("⏰ Auto-rejecting video call after 30 seconds");
        handleDeny();
      }, 30000);

      return () => clearTimeout(timeout);
    }
  }, [open, call_details, handleDeny]);

  if (!call_details) return null;

  const callerName = call_details.from_user?.firstName
    ? `${call_details.from_user.firstName} ${
        call_details.from_user.lastName || ""
      }`
    : call_details.from_name || "Unknown Caller";

  const callerAvatar = call_details.from_user?.avatar
    ? call_details.from_user.avatar
    : null;

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
          background: "linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)",
          boxShadow: "0 10px 30px rgba(255, 65, 108, 0.3)",
        },
      }}
    >
      <DialogContent>
        <Stack spacing={3} alignItems="center" p={3}>
          {/* Caller Avatar with Animation */}
          <Box sx={{ position: "relative" }}>
            <Avatar
              sx={{
                height: 120,
                width: 120,
                border: "4px solid rgba(255,255,255,0.3)",
                backgroundColor: "rgba(255,255,255,0.2)",
                fontSize: 40,
              }}
              src={callerAvatar}
            >
              {callerName.charAt(0).toUpperCase()}
            </Avatar>

            {/* Video Icon Overlay */}
            <Box
              sx={{
                position: "absolute",
                bottom: 5,
                right: 5,
                backgroundColor: "#FF416C",
                borderRadius: "50%",
                p: 1,
                border: "3px solid white",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              }}
            >
              <VideoCamera size={24} color="white" weight="fill" />
            </Box>

            {/* Ringing Animation */}
            <Box
              sx={{
                position: "absolute",
                top: -15,
                left: -15,
                right: -15,
                bottom: -15,
                border: "2px solid rgba(255,255,255,0.3)",
                borderRadius: "50%",
                animation: "ripple 1.5s infinite",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                top: -25,
                left: -25,
                right: -25,
                bottom: -25,
                border: "2px solid rgba(255,255,255,0.2)",
                borderRadius: "50%",
                animation: "ripple 1.5s infinite",
                animationDelay: "0.5s",
              }}
            />
          </Box>

          {/* Call Info */}
          <Box textAlign="center">
            <Typography
              variant="h5"
              fontWeight="bold"
              color="white"
              gutterBottom
            >
              {callerName}
            </Typography>
            <Typography
              variant="body1"
              color="rgba(255,255,255,0.9)"
              sx={{ mb: 0.5 }}
            >
              Incoming Video Call
            </Typography>
            <Typography
              variant="body2"
              color="rgba(255,255,255,0.7)"
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.5,
              }}
            >
              <VideoCamera size={16} />
              WebRTC Video Call
            </Typography>
          </Box>

          {/* Action Buttons */}
          <Stack
            direction="row"
            spacing={2}
            sx={{
              width: "100%",
              mt: 2,
              justifyContent: "center",
            }}
          >
            <Button
              onClick={handleDeny}
              variant="contained"
              color="error"
              size="large"
              startIcon={<PhoneSlash size={22} />}
              sx={{
                px: 3,
                py: 1.5,
                borderRadius: 3,
                fontWeight: "bold",
                fontSize: "1rem",
                minWidth: 120,
                boxShadow: "0 4px 12px rgba(244, 67, 54, 0.3)",
                "&:hover": {
                  boxShadow: "0 6px 16px rgba(244, 67, 54, 0.4)",
                },
              }}
              disabled={isLoading}
            >
              Decline
            </Button>

            <Button
              onClick={handleAccept}
              variant="contained"
              color="success"
              size="large"
              startIcon={
                isLoading ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <VideoCamera size={22} />
                )
              }
              sx={{
                px: 3,
                py: 1.5,
                borderRadius: 3,
                fontWeight: "bold",
                fontSize: "1rem",
                minWidth: 120,
                boxShadow: "0 4px 12px rgba(76, 175, 80, 0.3)",
                "&:hover": {
                  boxShadow: "0 6px 16px rgba(76, 175, 80, 0.4)",
                },
              }}
              disabled={isLoading}
            >
              {isLoading ? "Answering..." : "Answer"}
            </Button>
          </Stack>

          {/* Auto-reject timer */}
          <Typography
            variant="caption"
            color="rgba(255,255,255,0.5)"
            sx={{ mt: 1 }}
          >
            Auto-reject in 30 seconds
          </Typography>
        </Stack>
      </DialogContent>

      {/* CSS for ringing animation */}
      <style jsx="true">{`
        @keyframes ripple {
          0% {
            transform: scale(1);
            opacity: 0.8;
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
