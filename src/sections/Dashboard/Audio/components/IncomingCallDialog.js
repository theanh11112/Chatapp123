import React, { useState, useEffect } from "react";
import PropTypes from "prop-types"; // 🔴 THÊM DÒNG NÀY
import {
  Dialog,
  DialogContent,
  Slide,
  Stack,
  Typography,
  Box,
  Avatar,
  Button,
  CircularProgress,
  IconButton,
  Tooltip,
  LinearProgress,
} from "@mui/material";
import {
  PhoneSlash,
  Phone,
  User,
  Microphone,
  MicrophoneSlash,
  SpeakerHigh,
  SpeakerSlash,
  Clock,
  WarningCircle,
} from "phosphor-react";
import { useTheme } from "@mui/material/styles";
import { AWS_S3_REGION, S3_BUCKET_NAME } from "../../../../config";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const IncomingCallDialog = ({
  call,
  onAccept,
  onReject,
  status = "incoming",
  isConnecting = false,
  error = null,
  isAnswering = false,
  hasReceivedOffer = false,
  callDuration = 0,
  onToggleMute = null,
  onToggleSpeaker = null,
  isMuted = false,
  isSpeakerOn = true,
}) => {
  const theme = useTheme();
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showConnectionDetails, setShowConnectionDetails] = useState(false);

  // Format thời gian
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Lấy trạng thái hiển thị
  const getStatusText = () => {
    if (error) return "Connection Error";
    if (isConnecting && hasReceivedOffer) return "Establishing connection...";
    if (isConnecting) return "Waiting for caller...";
    if (isAnswering) return "Answering call...";
    if (callDuration > 0) return `Calling... ${formatTime(callDuration)}`;

    switch (status) {
      case "ringing":
        return "Ringing...";
      case "connecting":
        return "Connecting...";
      case "connected":
        return "Connected";
      default:
        return "Incoming call...";
    }
  };

  // Lấy màu nền dựa trên trạng thái
  const getBackground = () => {
    if (error) return "linear-gradient(135deg, #ff6b6b 0%, #c92a2a 100%)";
    if (isConnecting)
      return "linear-gradient(135deg, #ffd93d 0%, #ff9a3d 100%)";
    if (callDuration > 0)
      return "linear-gradient(135deg, #4cd137 0%, #44bd32 100%)";
    return "linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)";
  };

  // Lấy thông tin caller
  const callerName =
    call?.fromUser?.username ||
    call?.fromUser?.firstName ||
    call?.fromUser?.name ||
    "Unknown Caller";

  const callerAvatar = call?.fromUser?.avatar;

  // Hiệu ứng thời gian trôi qua
  useEffect(() => {
    let interval;
    if (callDuration > 0 || isConnecting) {
      interval = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callDuration, isConnecting]);

  // Reset time elapsed khi call thay đổi
  useEffect(() => {
    setTimeElapsed(0);
  }, [call?.callId]);

  if (!call) return null;

  return (
    <Dialog
      open={true}
      onClose={(event, reason) => {
        if (reason !== "backdropClick") {
          onReject();
        }
      }}
      TransitionComponent={Transition}
      maxWidth="xs"
      fullWidth
      disableEscapeKeyDown={isConnecting}
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxWidth: 400,
          width: "100%",
          background: getBackground(),
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          overflow: "hidden",
          transition: "all 0.3s ease",
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Stack spacing={3} alignItems="center" p={4}>
          {/* Avatar với hiệu ứng */}
          <Box sx={{ position: "relative", width: 140, height: 140 }}>
            {/* Hiệu ứng sóng ngoài */}
            <Box
              sx={{
                position: "absolute",
                top: -20,
                left: -20,
                right: -20,
                bottom: -20,
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.2)",
                animation: "ripple 2s infinite",
                zIndex: 1,
              }}
            />

            {/* Hiệu ứng sóng trong */}
            <Box
              sx={{
                position: "absolute",
                top: -10,
                left: -10,
                right: -10,
                bottom: -10,
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.3)",
                animation: "ripple 2s infinite",
                animationDelay: "0.5s",
                zIndex: 1,
              }}
            />

            {/* Avatar */}
            <Avatar
              src={
                callerAvatar
                  ? `https://${S3_BUCKET_NAME}.s3.${AWS_S3_REGION}.amazonaws.com/${callerAvatar}`
                  : undefined
              }
              sx={{
                width: 120,
                height: 120,
                border: "4px solid white",
                position: "relative",
                zIndex: 2,
                animation: isConnecting ? "pulse 1.5s infinite" : "none",
                bgcolor: "rgba(255,255,255,0.1)",
              }}
            >
              <User size={50} color="white" weight="fill" />
            </Avatar>

            {/* Badge trạng thái */}
            {isConnecting && (
              <Box
                sx={{
                  position: "absolute",
                  bottom: 5,
                  right: 5,
                  bgcolor: "rgba(255,255,255,0.9)",
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 3,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                }}
              >
                <CircularProgress size={20} />
              </Box>
            )}
          </Box>

          {/* Thông tin caller */}
          <Box textAlign="center">
            <Typography
              variant="h5"
              fontWeight="bold"
              color="white"
              sx={{
                textShadow: "0 2px 4px rgba(0,0,0,0.2)",
                mb: 0.5,
              }}
            >
              {callerName}
            </Typography>

            <Typography
              variant="body1"
              color="rgba(255,255,255,0.9)"
              sx={{
                fontWeight: 500,
                mb: 1,
              }}
            >
              Audio Call
            </Typography>

            {/* Trạng thái */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
              }}
            >
              {isConnecting && (
                <CircularProgress size={16} sx={{ color: "white" }} />
              )}
              <Typography
                variant="body2"
                color="rgba(255,255,255,0.8)"
                sx={{
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                {getStatusText()}
              </Typography>
            </Box>

            {/* Thời gian đã trôi qua */}
            {(callDuration > 0 || timeElapsed > 0) && (
              <Typography
                variant="caption"
                color="rgba(255,255,255,0.7)"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 0.5,
                  mt: 1,
                }}
              >
                <Clock size={12} />
                {formatTime(callDuration || timeElapsed)}
              </Typography>
            )}

            {/* Connection progress */}
            {isConnecting && (
              <Box sx={{ width: "100%", mt: 2 }}>
                <LinearProgress
                  sx={{
                    height: 4,
                    borderRadius: 2,
                    bgcolor: "rgba(255,255,255,0.2)",
                    "& .MuiLinearProgress-bar": {
                      bgcolor: "white",
                    },
                  }}
                  variant="indeterminate"
                />
              </Box>
            )}

            {/* Chi tiết lỗi */}
            {error && (
              <Tooltip title="Click for details" arrow>
                <Box
                  onClick={() =>
                    setShowConnectionDetails(!showConnectionDetails)
                  }
                  sx={{
                    mt: 2,
                    p: 1.5,
                    bgcolor: "rgba(255,255,255,0.1)",
                    borderRadius: 2,
                    border: "1px solid rgba(255,255,255,0.2)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      bgcolor: "rgba(255,255,255,0.15)",
                    },
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <WarningCircle size={16} color="#ff6b6b" />
                    <Typography
                      variant="caption"
                      color="#ff6b6b"
                      sx={{ fontWeight: 500 }}
                    >
                      Connection issue
                    </Typography>
                  </Stack>

                  {showConnectionDetails && (
                    <Typography
                      variant="caption"
                      color="rgba(255,255,255,0.8)"
                      sx={{
                        display: "block",
                        mt: 1,
                        fontSize: "0.7rem",
                      }}
                    >
                      {error}
                    </Typography>
                  )}
                </Box>
              </Tooltip>
            )}
          </Box>

          {/* Controls */}
          <Stack
            direction="row"
            spacing={2}
            sx={{
              width: "100%",
              mt: 2,
              justifyContent: "center",
            }}
          >
            {/* Mute/Unmute control (chỉ hiển thị khi đang kết nối) */}
            {isConnecting && onToggleMute && (
              <Tooltip title={isMuted ? "Unmute" : "Mute"} arrow>
                <IconButton
                  onClick={onToggleMute}
                  sx={{
                    bgcolor: "rgba(255,255,255,0.2)",
                    color: "white",
                    "&:hover": {
                      bgcolor: "rgba(255,255,255,0.3)",
                    },
                  }}
                >
                  {isMuted ? (
                    <MicrophoneSlash size={20} />
                  ) : (
                    <Microphone size={20} />
                  )}
                </IconButton>
              </Tooltip>
            )}

            {/* Speaker control (chỉ hiển thị khi đang kết nối) */}
            {isConnecting && onToggleSpeaker && (
              <Tooltip
                title={isSpeakerOn ? "Turn off speaker" : "Turn on speaker"}
                arrow
              >
                <IconButton
                  onClick={onToggleSpeaker}
                  sx={{
                    bgcolor: "rgba(255,255,255,0.2)",
                    color: "white",
                    "&:hover": {
                      bgcolor: "rgba(255,255,255,0.3)",
                    },
                  }}
                >
                  {isSpeakerOn ? (
                    <SpeakerHigh size={20} />
                  ) : (
                    <SpeakerSlash size={20} />
                  )}
                </IconButton>
              </Tooltip>
            )}
          </Stack>

          {/* Action Buttons */}
          <Stack
            direction="row"
            spacing={2}
            sx={{
              width: "100%",
              mt: 2,
            }}
          >
            {/* Decline Button */}
            <Button
              variant="contained"
              color="error"
              startIcon={<PhoneSlash size={20} />}
              onClick={onReject}
              disabled={isConnecting}
              fullWidth
              sx={{
                py: 1.5,
                borderRadius: 2,
                fontWeight: "bold",
                textTransform: "none",
                boxShadow: "0 4px 12px rgba(220, 53, 69, 0.3)",
                "&:hover": {
                  boxShadow: "0 6px 16px rgba(220, 53, 69, 0.4)",
                  transform: "translateY(-2px)",
                },
                "&:disabled": {
                  opacity: 0.6,
                  transform: "none",
                },
                transition: "all 0.2s ease",
              }}
            >
              Decline
            </Button>

            {/* Answer Button */}
            <Button
              variant="contained"
              color={isConnecting ? "warning" : "success"}
              startIcon={
                isConnecting ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <Phone size={20} />
                )
              }
              onClick={onAccept}
              disabled={isConnecting}
              fullWidth
              sx={{
                py: 1.5,
                borderRadius: 2,
                fontWeight: "bold",
                textTransform: "none",
                boxShadow: isConnecting
                  ? "0 4px 12px rgba(255, 193, 7, 0.3)"
                  : "0 4px 12px rgba(40, 167, 69, 0.3)",
                "&:hover:not(:disabled)": {
                  boxShadow: isConnecting
                    ? "0 6px 16px rgba(255, 193, 7, 0.4)"
                    : "0 6px 16px rgba(40, 167, 69, 0.4)",
                  transform: "translateY(-2px)",
                },
                "&:disabled": {
                  opacity: 0.8,
                  transform: "none",
                },
                transition: "all 0.2s ease",
              }}
            >
              {isAnswering
                ? "Answering..."
                : isConnecting
                ? "Connecting..."
                : "Answer"}
            </Button>
          </Stack>

          {/* Footer Info */}
          <Typography
            variant="caption"
            color="rgba(255,255,255,0.6)"
            sx={{
              textAlign: "center",
              mt: 1,
            }}
          >
            Call ID: {call.callId?.slice(0, 8) || "N/A"} • Room:{" "}
            {call.roomID?.slice(0, 8) || "N/A"}
          </Typography>
        </Stack>
      </DialogContent>

      {/* CSS Animations */}
      <style jsx="true">{`
        @keyframes ripple {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4);
          }
          70% {
            transform: scale(1.05);
            box-shadow: 0 0 0 10px rgba(255, 255, 255, 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
          }
        }
      `}</style>
    </Dialog>
  );
};

// Props validation
IncomingCallDialog.propTypes = {
  call: PropTypes.shape({
    callId: PropTypes.string,
    roomID: PropTypes.string,
    fromUser: PropTypes.shape({
      username: PropTypes.string,
      firstName: PropTypes.string,
      name: PropTypes.string,
      avatar: PropTypes.string,
    }),
  }),
  onAccept: PropTypes.func.isRequired,
  onReject: PropTypes.func.isRequired,
  status: PropTypes.string,
  isConnecting: PropTypes.bool,
  error: PropTypes.string,
  isAnswering: PropTypes.bool,
  hasReceivedOffer: PropTypes.bool,
  callDuration: PropTypes.number,
  onToggleMute: PropTypes.func,
  onToggleSpeaker: PropTypes.func,
  isMuted: PropTypes.bool,
  isSpeakerOn: PropTypes.bool,
};

// Default props
IncomingCallDialog.defaultProps = {
  status: "incoming",
  isConnecting: false,
  error: null,
  isAnswering: false,
  hasReceivedOffer: false,
  callDuration: 0,
  isMuted: false,
  isSpeakerOn: true,
};

export default React.memo(IncomingCallDialog);
