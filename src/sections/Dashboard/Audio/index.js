/**
 * Barrel export file for Audio Call module
 * Centralized exports for cleaner imports in other files
 */

// Main component
export { default as AudioCallDialog } from "./AudioCallDialog";

// Custom hooks
export { useAudioCall } from "./hooks/useAudioCall";
export { useWebRTCSetup } from "./hooks/useWebRTCSetup";
export { useSocketListeners } from "./hooks/useSocketListeners";
export { useCallControls } from "./hooks/useCallControls";
export { useCallTimer } from "./hooks/useCallTimer";

// UI Components
export { default as IncomingCallDialog } from "./components/IncomingCallDialog";
export { default as ActiveCallDialog } from "./components/ActiveCallDialog";
export { default as CallControls } from "./components/CallControls";

// Utilities
export { log } from "./utils/audioCallLogger";
export {
  formatDuration,
  formatCallName,
  formatCallAvatar,
} from "./utils/callFormatters";
export { emitWithRetry, checkSocketConnection } from "./utils/socketHelpers";

// Constants
export * from "./constants/audioCallConstants";

// Default export
export { AudioCallDialog as default } from "./AudioCallDialog";
