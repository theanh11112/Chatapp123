// src/pages/dashboard/Settings/components/SettingsListItem.js
import React from "react";
import { Stack, Typography, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";

const SettingsListItem = ({ item }) => {
  const theme = useTheme();

  return (
    <Stack
      onClick={item.onClick}
      sx={{
        cursor: item.onClick ? "pointer" : "default",
        "&:hover": {
          backgroundColor: item.onClick ? "action.hover" : "transparent",
          borderRadius: 1,
        },
        p: 1,
        transition: "all 0.2s ease",
      }}
      spacing={1}
    >
      <Stack direction="row" alignItems="center" spacing={2}>
        <Box sx={{ color: "primary.main" }}>{item.icon}</Box>
        <Stack flex={1}>
          <Typography variant="body1" fontWeight={500}>
            {item.title}
          </Typography>
          {item.subtitle && (
            <Typography variant="caption" color="text.secondary">
              {item.subtitle}
            </Typography>
          )}
        </Stack>
      </Stack>
    </Stack>
  );
};

export default SettingsListItem;
