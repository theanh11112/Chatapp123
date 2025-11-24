import React from "react";
import {
  Box,
  Stack,
  Typography,
  Button,
  useTheme,
  Container,
  Card,
  CardContent,
} from "@mui/material";
import {
  Phone,
  VideoCamera,
  Users,
  ChatCircleText,
  Star,
  Clock,
  Shield,
  Heart,
} from "phosphor-react";

const CallPlaceholder = () => {
  const theme = useTheme();

  const features = [
    {
      icon: <Phone size={32} />,
      title: "Audio Calls",
      description: "High quality voice calls with your contacts",
      color: theme.palette.primary.main,
    },
    {
      icon: <VideoCamera size={32} />,
      title: "Video Calls",
      description: "Face-to-face conversations with crystal clear video",
      color: theme.palette.error.main,
    },
    {
      icon: <Users size={32} />,
      title: "Group Calls",
      description: "Connect with multiple people at once",
      color: theme.palette.success.main,
    },
    {
      icon: <ChatCircleText size={32} />,
      title: "Call History",
      description: "Keep track of all your conversations",
      color: theme.palette.warning.main,
    },
    {
      icon: <Clock size={32} />,
      title: "24/7 Available",
      description: "Call anytime, anywhere",
      color: theme.palette.info.main,
    },
    {
      icon: <Shield size={32} />,
      title: "Secure & Private",
      description: "End-to-end encrypted calls",
      color: theme.palette.secondary.main,
    },
  ];

  const testimonials = [
    {
      text: "The call quality is amazing! Crystal clear audio every time.",
      author: "Alex Johnson",
    },
    {
      text: "Video calls are so smooth, even on slow internet.",
      author: "Maria Garcia",
    },
    {
      text: "Best calling app I've used. Simple and reliable.",
      author: "David Kim",
    },
  ];

  return (
    <Box
      sx={{
        flex: 1,
        height: "100vh",
        overflowY: "auto",
        background:
          theme.palette.mode === "light"
            ? "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)"
            : "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
      }}
    >
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={6}>
          {/* Hero Section */}
          <Box
            sx={{
              textAlign: "center",
              py: 8,
              background:
                theme.palette.mode === "light"
                  ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                  : "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
              borderRadius: 4,
              color: "white",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                bottom: -30,
                left: -30,
                width: 150,
                height: 150,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
              }}
            />

            <Container maxWidth="sm">
              <Stack
                spacing={3}
                alignItems="center"
                position="relative"
                zIndex={1}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <Phone size={40} color="white" weight="fill" />
                </Box>

                <Typography variant="h3" fontWeight="bold">
                  Start Connecting
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.9 }}>
                  Select a call from your history or start a new conversation
                </Typography>

                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<Phone />}
                    size="large"
                    sx={{
                      borderRadius: 3,
                      px: 3,
                      py: 1,
                      background: "rgba(255,255,255,0.2)",
                      backdropFilter: "blur(10px)",
                      "&:hover": {
                        background: "rgba(255,255,255,0.3)",
                      },
                    }}
                  >
                    Audio Call
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<VideoCamera />}
                    size="large"
                    sx={{
                      borderRadius: 3,
                      px: 3,
                      py: 1,
                      borderColor: "white",
                      color: "white",
                      "&:hover": {
                        background: "rgba(255,255,255,0.1)",
                      },
                    }}
                  >
                    Video Call
                  </Button>
                </Stack>
              </Stack>
            </Container>
          </Box>

          {/* Features Grid */}
          <Box>
            <Typography
              variant="h4"
              textAlign="center"
              fontWeight="bold"
              gutterBottom
              color={theme.palette.mode === "light" ? "text.primary" : "white"}
            >
              Everything You Need
            </Typography>
            <Typography
              variant="h6"
              textAlign="center"
              color="text.secondary"
              sx={{ mb: 4 }}
            >
              Powerful features for seamless communication
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(3, 1fr)",
                },
                gap: 3,
              }}
            >
              {features.map((feature, index) => (
                <Card
                  key={index}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    textAlign: "center",
                    transition: "all 0.3s ease",
                    border: `1px solid ${theme.palette.divider}`,
                    "&:hover": {
                      transform: "translateY(-8px)",
                      boxShadow: theme.shadows[8],
                      borderColor: feature.color,
                    },
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        color: feature.color,
                        mb: 2,
                      }}
                    >
                      {feature.icon}
                    </Box>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>

          {/* Stats Section */}
          <Box
            sx={{
              p: 4,
              borderRadius: 4,
              background: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={4}
              alignItems="center"
              justifyContent="space-around"
              textAlign="center"
            >
              <Stack alignItems="center">
                <Typography variant="h2" fontWeight="bold" color="primary">
                  99%
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  Uptime
                </Typography>
              </Stack>
              <Stack alignItems="center">
                <Typography variant="h2" fontWeight="bold" color="primary">
                  HD
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  Quality
                </Typography>
              </Stack>
              <Stack alignItems="center">
                <Typography variant="h2" fontWeight="bold" color="primary">
                  Secure
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  Calls
                </Typography>
              </Stack>
              <Stack alignItems="center">
                <Typography variant="h2" fontWeight="bold" color="primary">
                  24/7
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  Support
                </Typography>
              </Stack>
            </Stack>
          </Box>

          {/* Testimonials */}
          <Box>
            <Typography
              variant="h4"
              textAlign="center"
              fontWeight="bold"
              gutterBottom
              color={theme.palette.mode === "light" ? "text.primary" : "white"}
            >
              Loved by Users
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(3, 1fr)",
                },
                gap: 3,
              }}
            >
              {testimonials.map((testimonial, index) => (
                <Card
                  key={index}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    border: `1px solid ${theme.palette.divider}`,
                    position: "relative",
                  }}
                >
                  <CardContent>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{ mb: 2 }}
                    >
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={16}
                          color={theme.palette.warning.main}
                          weight="fill"
                        />
                      ))}
                    </Stack>
                    <Typography
                      variant="body1"
                      fontStyle="italic"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      "{testimonial.text}"
                    </Typography>
                    <Typography
                      variant="subtitle2"
                      color="primary"
                      fontWeight="bold"
                    >
                      {testimonial.author}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>

          {/* CTA Section */}
          <Box
            sx={{
              textAlign: "center",
              py: 6,
              background: theme.palette.background.paper,
              borderRadius: 4,
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Stack spacing={3} alignItems="center">
              <Box
                sx={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  background: theme.palette.primary.main,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Heart size={28} color="white" weight="fill" />
              </Box>

              <Typography variant="h4" fontWeight="bold">
                Ready to Get Started?
              </Typography>
              <Typography
                variant="h6"
                color="text.secondary"
                sx={{ maxWidth: 500 }}
              >
                Join thousands of happy users who trust our platform for their
                daily communication needs
              </Typography>

              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Phone />}
                  sx={{
                    borderRadius: 3,
                    px: 4,
                    py: 1.5,
                  }}
                >
                  Make Your First Call
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  sx={{
                    borderRadius: 3,
                    px: 4,
                    py: 1.5,
                  }}
                >
                  Learn More
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
};

export default CallPlaceholder;
