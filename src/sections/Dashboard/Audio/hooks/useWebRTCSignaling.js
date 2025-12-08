// Thêm vào useWebRTCSetup.js hoặc tạo file mới: useWebRTCSignaling.js
import { useCallback } from "react";
import webRTCService from "../../services/webRTCService";

export const useWebRTCSignaling = () => {
  const handleWebRTCOffer = useCallback(async (data) => {
    console.log("📞 Handling WebRTC offer:", data);

    try {
      // Kiểm tra nếu offer là cho call hiện tại
      if (!webRTCService.hasActiveRoom()) {
        console.error("❌ No active WebRTC room");
        return;
      }

      // Xử lý offer từ remote
      await webRTCService.handleOffer(data.offer);
      console.log("✅ WebRTC offer handled successfully");
    } catch (error) {
      console.error("❌ Failed to handle WebRTC offer:", error);
    }
  }, []);

  const handleWebRTCAnswer = useCallback(async (data) => {
    console.log("📞 Handling WebRTC answer:", data);

    try {
      if (!webRTCService.hasActiveRoom()) {
        console.error("❌ No active WebRTC room");
        return;
      }

      // Xử lý answer từ remote
      await webRTCService.handleAnswer(data.answer);
      console.log("✅ WebRTC answer handled successfully");
    } catch (error) {
      console.error("❌ Failed to handle WebRTC answer:", error);
    }
  }, []);

  const handleWebRTCIceCandidate = useCallback(async (data) => {
    console.log("📞 Handling ICE candidate:", data);

    try {
      if (!webRTCService.hasActiveRoom()) {
        return;
      }

      // Thêm ICE candidate
      await webRTCService.addIceCandidate(data.candidate);
      console.log("✅ ICE candidate added");
    } catch (error) {
      console.error("❌ Failed to add ICE candidate:", error);
    }
  }, []);

  return {
    handleWebRTCOffer,
    handleWebRTCAnswer,
    handleWebRTCIceCandidate,
  };
};
