// src/pages/Settings.js
import React, { useState } from "react";
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Button,
  Switch,
  FormControlLabel,
  TextField,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  PrivacyTip as PrivacyIcon,
  Language as LanguageIcon,
  Palette as PaletteIcon,
} from "@mui/icons-material";

const Settings = () => {
  const navigate = useNavigate();

  // State cho các setting
  const [settings, setSettings] = useState({
    // Notification settings
    emailNotifications: true,
    pushNotifications: true,
    messageSounds: true,
    callSounds: true,

    // Privacy settings
    showOnlineStatus: true,
    showLastSeen: true,
    allowFriendRequests: true,

    // Appearance
    darkMode: false,
    language: "en",

    // Account
    twoFactorAuth: false,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: "", text: "" });

  const handleToggle = (setting) => {
    setSettings((prev) => ({
      ...prev,
      [setting]: !prev[setting],
    }));
  };

  const handleSelectChange = (setting, value) => {
    setSettings((prev) => ({
      ...prev,
      [setting]: value,
    }));
  };

  const handleSaveSettings = () => {
    setIsSaving(true);

    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      setSaveMessage({
        type: "success",
        text: "Settings saved successfully!",
      });

      // Clear message after 3 seconds
      setTimeout(() => {
        setSaveMessage({ type: "", text: "" });
      }, 3000);
    }, 1000);
  };

  const handleResetSettings = () => {
    setSettings({
      emailNotifications: true,
      pushNotifications: true,
      messageSounds: true,
      callSounds: true,
      showOnlineStatus: true,
      showLastSeen: true,
      allowFriendRequests: true,
      darkMode: false,
      language: "en",
      twoFactorAuth: false,
    });

    setSaveMessage({
      type: "info",
      text: "Settings reset to defaults",
    });
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Button
        variant="outlined"
        onClick={handleGoBack}
        sx={{ mb: 3 }}
        startIcon="←"
      >
        Back
      </Button>

      <Typography variant="h4" gutterBottom fontWeight="bold">
        Settings
      </Typography>

      {saveMessage.text && (
        <Alert
          severity={saveMessage.type}
          sx={{ mb: 3 }}
          onClose={() => setSaveMessage({ type: "", text: "" })}
        >
          {saveMessage.text}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left Column - Navigation */}
        <Grid item xs={12} md={3}>
          <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
            <List>
              <ListItem button selected sx={{ borderRadius: 1 }}>
                <ListItemIcon>
                  <NotificationsIcon />
                </ListItemIcon>
                <ListItemText primary="Notifications" />
              </ListItem>
              <ListItem button sx={{ borderRadius: 1 }}>
                <ListItemIcon>
                  <PrivacyIcon />
                </ListItemIcon>
                <ListItemText primary="Privacy" />
              </ListItem>
              <ListItem button sx={{ borderRadius: 1 }}>
                <ListItemIcon>
                  <SecurityIcon />
                </ListItemIcon>
                <ListItemText primary="Security" />
              </ListItem>
              <ListItem button sx={{ borderRadius: 1 }}>
                <ListItemIcon>
                  <PaletteIcon />
                </ListItemIcon>
                <ListItemText primary="Appearance" />
              </ListItem>
              <ListItem button sx={{ borderRadius: 1 }}>
                <ListItemIcon>
                  <LanguageIcon />
                </ListItemIcon>
                <ListItemText primary="Language" />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* Right Column - Settings Content */}
        <Grid item xs={12} md={9}>
          <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
            {/* Notifications Section */}
            <Box sx={{ mb: 4 }}>
              <Typography
                variant="h5"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <NotificationsIcon color="primary" />
                Notifications
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.emailNotifications}
                        onChange={() => handleToggle("emailNotifications")}
                        color="primary"
                      />
                    }
                    label="Email Notifications"
                    sx={{ mb: 2 }}
                  />
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ ml: 4 }}
                  >
                    Receive notifications via email
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.pushNotifications}
                        onChange={() => handleToggle("pushNotifications")}
                        color="primary"
                      />
                    }
                    label="Push Notifications"
                    sx={{ mb: 2 }}
                  />
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ ml: 4 }}
                  >
                    Receive push notifications in browser
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.messageSounds}
                        onChange={() => handleToggle("messageSounds")}
                        color="primary"
                      />
                    }
                    label="Message Sounds"
                    sx={{ mb: 2 }}
                  />
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ ml: 4 }}
                  >
                    Play sound for new messages
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.callSounds}
                        onChange={() => handleToggle("callSounds")}
                        color="primary"
                      />
                    }
                    label="Call Sounds"
                    sx={{ mb: 2 }}
                  />
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ ml: 4 }}
                  >
                    Play sound for incoming calls
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Privacy Section */}
            <Box sx={{ mb: 4 }}>
              <Typography
                variant="h5"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <PrivacyIcon color="primary" />
                Privacy
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.showOnlineStatus}
                        onChange={() => handleToggle("showOnlineStatus")}
                        color="primary"
                      />
                    }
                    label="Show Online Status"
                    sx={{ mb: 2 }}
                  />
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ ml: 4 }}
                  >
                    Allow others to see when you're online
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.showLastSeen}
                        onChange={() => handleToggle("showLastSeen")}
                        color="primary"
                      />
                    }
                    label="Show Last Seen"
                    sx={{ mb: 2 }}
                  />
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ ml: 4 }}
                  >
                    Show when you were last active
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.allowFriendRequests}
                        onChange={() => handleToggle("allowFriendRequests")}
                        color="primary"
                      />
                    }
                    label="Allow Friend Requests"
                    sx={{ mb: 2 }}
                  />
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ ml: 4 }}
                  >
                    Allow others to send you friend requests
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Appearance & Language */}
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <PaletteIcon color="primary" />
                  Appearance
                </Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.darkMode}
                      onChange={() => handleToggle("darkMode")}
                      color="primary"
                    />
                  }
                  label="Dark Mode"
                  sx={{ mb: 2 }}
                />
                <Typography
                  variant="body2"
                  color="textSecondary"
                  sx={{ ml: 4 }}
                >
                  Switch between light and dark theme
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <LanguageIcon color="primary" />
                  Language
                </Typography>

                <TextField
                  select
                  fullWidth
                  value={settings.language}
                  onChange={(e) =>
                    handleSelectChange("language", e.target.value)
                  }
                  SelectProps={{
                    native: true,
                  }}
                  variant="outlined"
                  size="small"
                >
                  <option value="en">English</option>
                  <option value="vi">Vietnamese</option>
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                </TextField>
              </Grid>
            </Grid>

            <Divider sx={{ my: 4 }} />

            {/* Action Buttons */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 2,
                mt: 4,
              }}
            >
              <Button
                variant="outlined"
                onClick={handleResetSettings}
                disabled={isSaving}
              >
                Reset to Defaults
              </Button>

              <Button
                variant="contained"
                onClick={handleSaveSettings}
                disabled={isSaving}
                sx={{ minWidth: 120 }}
              >
                {isSaving ? "Saving..." : "Save Settings"}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Settings;
