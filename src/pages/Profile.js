// src/pages/Profile.js
import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Typography,
  Avatar,
  Box,
  Grid,
  Button,
  TextField,
  CircularProgress,
  IconButton,
  Card,
  CardContent,
  Snackbar,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  PhotoCamera,
  ArrowBack,
  Minimize,
  Maximize,
  Undo,
  Close,
} from "@mui/icons-material";
import {
  FetchUserProfile,
  UpdateUserProfile,
  showSnackbar,
} from "../redux/slices/app";
import { AWS_S3_REGION, S3_BUCKET_NAME } from "../config";

const Profile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isLoading } = useSelector((state) => state.app);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    bio: "",
  });

  const [originalData, setOriginalData] = useState({});
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showUndoSnackbar, setShowUndoSnackbar] = useState(false);
  const [undoData, setUndoData] = useState(null);

  // Fetch user data
  useEffect(() => {
    dispatch(FetchUserProfile());
  }, [dispatch]);

  // Update form data
  useEffect(() => {
    if (user) {
      const newFormData = {
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
        bio: user.bio || "",
      };

      setFormData(newFormData);
      setOriginalData(newFormData);

      if (user.avatar && S3_BUCKET_NAME && AWS_S3_REGION) {
        setAvatarPreview(
          `https://${S3_BUCKET_NAME}.s3.${AWS_S3_REGION}.amazonaws.com/${user.avatar}`
        );
      }
    }
  }, [user]);

  // Kiểm tra thay đổi
  const hasChanges = () => {
    return (
      JSON.stringify(formData) !== JSON.stringify(originalData) || avatarFile
    );
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const dataToSend = { ...formData };
      if (avatarFile) {
        dataToSend.avatar = avatarFile;
      }

      await dispatch(UpdateUserProfile(dataToSend)).unwrap();
      setOriginalData(formData);
      setAvatarFile(null);

      dispatch(
        showSnackbar({
          severity: "success",
          message: "Profile updated successfully!",
        })
      );
    } catch (error) {
      console.error("Update profile error:", error);
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Failed to update profile",
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoBack = () => {
    if (hasChanges()) {
      if (
        window.confirm(
          "You have unsaved changes. Are you sure you want to go back?"
        )
      ) {
        navigate(-1);
      }
    } else {
      navigate(-1);
    }
  };

  // Toggle thu nhỏ/phóng to
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // Undo changes
  const handleUndoChanges = () => {
    setUndoData({
      formData: { ...formData },
      avatarFile,
      avatarPreview,
    });

    setFormData({ ...originalData });
    setAvatarFile(null);

    if (user?.avatar && S3_BUCKET_NAME && AWS_S3_REGION) {
      setAvatarPreview(
        `https://${S3_BUCKET_NAME}.s3.${AWS_S3_REGION}.amazonaws.com/${user.avatar}`
      );
    } else {
      setAvatarPreview("");
    }

    setShowUndoSnackbar(true);
    dispatch(
      showSnackbar({
        severity: "info",
        message: "Changes undone",
      })
    );
  };

  // Redo changes
  const handleRedoChanges = () => {
    if (undoData) {
      setFormData({ ...undoData.formData });
      setAvatarFile(undoData.avatarFile);
      setAvatarPreview(undoData.avatarPreview);
      setUndoData(null);

      dispatch(
        showSnackbar({
          severity: "info",
          message: "Changes restored",
        })
      );
    }
  };

  const handleCloseUndoSnackbar = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setShowUndoSnackbar(false);
  };

  const undoSnackbarAction = (
    <React.Fragment>
      <Button
        color="secondary"
        size="small"
        onClick={handleRedoChanges}
        disabled={!undoData}
      >
        REDO
      </Button>
      <IconButton
        size="small"
        aria-label="close"
        color="inherit"
        onClick={handleCloseUndoSnackbar}
      >
        <Close fontSize="small" />
      </IconButton>
    </React.Fragment>
  );

  if (isLoading && !user) {
    return (
      <Container sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Paper
        elevation={1}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={handleGoBack} color="primary">
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" fontWeight="bold">
            My Profile
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          {hasChanges() && (
            <Button
              variant="outlined"
              startIcon={<Undo />}
              onClick={handleUndoChanges}
              size="small"
              color="warning"
            >
              Undo
            </Button>
          )}

          {/* Nút thu nhỏ/phóng to DUY NHẤT */}
          <IconButton
            onClick={toggleMinimize}
            color="primary"
            aria-label={isMinimized ? "Maximize" : "Minimize"}
          >
            {isMinimized ? <Maximize /> : <Minimize />}
          </IconButton>
        </Box>
      </Paper>

      {/* Hiển thị Full View hoặc Minimized View */}
      {isMinimized ? (
        // MINIMIZED VIEW
        <Card elevation={2}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item>
                <Avatar src={avatarPreview} sx={{ width: 60, height: 60 }}>
                  {formData.firstName?.charAt(0) || "U"}
                </Avatar>
              </Grid>
              <Grid item xs>
                <Typography variant="h6">
                  {formData.firstName} {formData.lastName}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {formData.email}
                </Typography>
                {hasChanges() && (
                  <Typography variant="caption" color="warning.main">
                    • Unsaved changes
                  </Typography>
                )}
              </Grid>
              <Grid item>
                <Button
                  variant="contained"
                  size="small"
                  onClick={toggleMinimize}
                  startIcon={<Maximize />}
                >
                  Expand
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ) : (
        // FULL VIEW
        <>
          <Paper elevation={3} sx={{ p: 4, borderRadius: 2, mb: 3 }}>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={4}>
                {/* Left Column - Avatar */}
                <Grid item xs={12} md={4}>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <Avatar
                      src={avatarPreview}
                      sx={{
                        width: 150,
                        height: 150,
                        mb: 3,
                        border: "3px solid",
                        borderColor: hasChanges()
                          ? "warning.main"
                          : "primary.main",
                        transition: "all 0.3s ease",
                      }}
                    >
                      {formData.firstName?.charAt(0) || "U"}
                    </Avatar>

                    <Button
                      component="label"
                      variant="contained"
                      startIcon={<PhotoCamera />}
                      sx={{ mb: 2 }}
                    >
                      Change Photo
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={handleAvatarChange}
                      />
                    </Button>

                    <Typography
                      variant="body2"
                      color="textSecondary"
                      align="center"
                    >
                      JPG, PNG up to 5MB
                    </Typography>
                  </Box>
                </Grid>

                {/* Right Column - Form */}
                <Grid item xs={12} md={8}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="First Name"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        variant="outlined"
                        error={formData.firstName === ""}
                        helperText={formData.firstName === "" ? "Required" : ""}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Last Name"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        variant="outlined"
                        error={formData.lastName === ""}
                        helperText={formData.lastName === "" ? "Required" : ""}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        disabled
                        variant="outlined"
                        helperText="Email cannot be changed"
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Phone Number"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        variant="outlined"
                        placeholder="+84 123 456 789"
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Bio"
                        name="bio"
                        value={formData.bio}
                        onChange={handleInputChange}
                        multiline
                        rows={4}
                        variant="outlined"
                        placeholder="Tell us about yourself..."
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mt: 2,
                          pt: 2,
                          borderTop: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        {hasChanges() && (
                          <Typography
                            variant="body2"
                            color="warning.main"
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <div
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                backgroundColor: "#ff9800",
                                animation: "pulse 1.5s infinite",
                              }}
                            />
                            Unsaved changes
                          </Typography>
                        )}

                        <Box sx={{ display: "flex", gap: 2 }}>
                          <Button
                            type="button"
                            variant="outlined"
                            onClick={handleGoBack}
                            disabled={isSubmitting}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            variant="contained"
                            disabled={isSubmitting || !hasChanges()}
                            sx={{ minWidth: 120 }}
                          >
                            {isSubmitting ? (
                              <CircularProgress size={24} color="inherit" />
                            ) : (
                              "Save Changes"
                            )}
                          </Button>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </form>
          </Paper>

          {/* Account Information Section */}
          <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              Account Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  Account Created
                </Typography>
                <Typography variant="body1">
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString()
                    : "N/A"}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">
                  Last Updated
                </Typography>
                <Typography variant="body1">
                  {user?.updatedAt
                    ? new Date(user.updatedAt).toLocaleDateString()
                    : "N/A"}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </>
      )}

      {/* Undo Snackbar */}
      <Snackbar
        open={showUndoSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseUndoSnackbar}
        message="Changes undone"
        action={undoSnackbarAction}
      />

      {/* CSS Animation */}
      <style jsx="true">{`
        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </Container>
  );
};

export default Profile;
