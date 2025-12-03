class SDPProcessor {
  /**
   * Ensure stable SDP order
   */
  static ensureStableOrder(sdp) {
    if (!sdp || typeof sdp !== "string") {
      return sdp;
    }

    // Split SDP into lines
    const lines = sdp.split("\r\n");

    // Group lines by type
    const sessionLines = lines.filter(
      (line) =>
        line.startsWith("a=") ||
        line.startsWith("v=") ||
        line.startsWith("o=") ||
        line.startsWith("s=") ||
        line.startsWith("t=") ||
        line.startsWith("c=")
    );

    const mediaLines = lines.filter((line) => line.startsWith("m="));
    const attributeLines = lines.filter(
      (line) => line.startsWith("a=") && !mediaLines.includes(line)
    );

    // Reconstruct with stable order
    const stableSDP =
      [...sessionLines, ...mediaLines, ...attributeLines].join("\r\n") + "\r\n";

    return stableSDP;
  }

  /**
   * Filter SDP for codec preferences
   */
  static filterCodecs(sdp, preferredCodecs = ["opus", "VP8"]) {
    if (!sdp) return sdp;

    const lines = sdp.split("\r\n");
    const filteredLines = [];
    let inMediaSection = false;
    let currentMediaType = "";

    lines.forEach((line) => {
      if (line.startsWith("m=")) {
        inMediaSection = true;
        currentMediaType = line.split(" ")[0].substring(2); // audio or video
        filteredLines.push(line);
      } else if (line === "") {
        inMediaSection = false;
        filteredLines.push(line);
      } else if (inMediaSection && line.startsWith("a=rtpmap:")) {
        // Filter codecs based on preference
        const codecName = line.toLowerCase();
        const isPreferred = preferredCodecs.some((codec) =>
          codecName.includes(codec.toLowerCase())
        );

        if (isPreferred) {
          filteredLines.push(line);
        }
      } else {
        filteredLines.push(line);
      }
    });

    return filteredLines.join("\r\n");
  }

  /**
   * Extract bandwidth information from SDP
   */
  static extractBandwidthInfo(sdp) {
    if (!sdp) return null;

    const bandwidthRegex = /b=(\w+):(\d+)/g;
    const matches = [];
    let match;

    while ((match = bandwidthRegex.exec(sdp)) !== null) {
      matches.push({
        type: match[1],
        value: parseInt(match[2], 10),
      });
    }

    return matches;
  }

  /**
   * Get number of media sections in SDP
   */
  static countMediaSections(sdp) {
    if (!sdp) return 0;
    return (sdp.match(/^m=/gm) || []).length;
  }
}

// Export as both default and named export
export default SDPProcessor;

// Named exports
export const ensureStableOrder = SDPProcessor.ensureStableOrder;
export const filterCodecs = SDPProcessor.filterCodecs;
export const extractBandwidthInfo = SDPProcessor.extractBandwidthInfo;
export const countMediaSections = SDPProcessor.countMediaSections;
