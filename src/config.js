// @mui
import { enUS, frFR, zhCN, viVN, arSD } from "@mui/material/locale";

// routes
import { PATH_DASHBOARD } from "./routes/paths";

// 🚨 SỬA: Thêm ZEGO config
export const ZEGO_APP_ID = 1642584767;
export const ZEGO_SERVER_SECRET =
  process.env.REACT_APP_ZEGO_SERVER_SECRET || "your_zego_server_secret_here";
export const ZEGO_SERVER_URL =
  "wss://webliveroom1642584767-api.coolzcloud.com/ws";

export const BASE_URL = "http://localhost:3001/";

// 🚨 QUAN TRỌNG: XÓA AWS CREDENTIALS KHỎI SOURCE CODE
// Đây là security risk rất lớn!
export const S3_BUCKET_NAME =
  process.env.REACT_APP_S3_BUCKET_NAME || "codingmonk";
export const AWS_S3_REGION =
  process.env.REACT_APP_AWS_S3_REGION || "ap-south-1";

// 🚨 XÓA 2 DÒNG NÀY - KHÔNG BAO GIỜ ĐỂ ACCESS KEY TRONG SOURCE CODE
// export const AWS_ACCESS_KEY = 'AKIARPJQ4HSYLBIK2TDE';
// export const AWS_SECRET_ACCESS_KEY = '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';

export const defaultSettings = {
  themeMode: "light",
  themeDirection: "ltr",
  themeContrast: "default",
  themeLayout: "horizontal",
  themeColorPresets: "default",
  themeStretch: false,
};

export const NAVBAR = {
  BASE_WIDTH: 260,
  DASHBOARD_WIDTH: 280,
  DASHBOARD_COLLAPSE_WIDTH: 88,
  //
  DASHBOARD_ITEM_ROOT_HEIGHT: 48,
  DASHBOARD_ITEM_SUB_HEIGHT: 40,
  DASHBOARD_ITEM_HORIZONTAL_HEIGHT: 32,
};

export const allLangs = [
  {
    label: "English",
    value: "en",
    systemValue: enUS,
    icon: "/assets/icons/flags/ic_flag_en.svg",
  },
  {
    label: "French",
    value: "fr",
    systemValue: frFR,
    icon: "/assets/icons/flags/ic_flag_fr.svg",
  },
  {
    label: "Vietnamese",
    value: "vn",
    systemValue: viVN,
    icon: "/assets/icons/flags/ic_flag_vn.svg",
  },
  {
    label: "Chinese",
    value: "cn",
    systemValue: zhCN,
    icon: "/assets/icons/flags/ic_flag_cn.svg",
  },
  {
    label: "Arabic (Sudan)",
    value: "ar",
    systemValue: arSD,
    icon: "/assets/icons/flags/ic_flag_sa.svg",
  },
];

export const defaultLang = allLangs[0]; // English

// CALL CONFIGURATION
// 🚨 THÊM: Call configuration
export const CALL_CONFIG = {
  MAX_PARTICIPANTS: 10,
  RING_TIMEOUT: 30000, // 30 seconds
  RECONNECT_ATTEMPTS: 3,
  RECONNECT_DELAY: 2000,
};

// SOCKET CONFIG
// 🚨 THÊM: Socket configuration
export const SOCKET_CONFIG = {
  RECONNECTION_ATTEMPTS: 5,
  RECONNECTION_DELAY: 1000,
  TIMEOUT: 20000,
};

// DEFAULT ROOT PATH
export const DEFAULT_PATH = PATH_DASHBOARD.general.app; // as '/app'
