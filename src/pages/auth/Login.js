import { useContext } from "react";
import { Stack, Typography, Button } from "@mui/material";
import { AuthContext } from "../../contexts/AuthContext";

// ----------------------------------------------------------------------

export default function LoginPage() {
  const { login } = useContext(AuthContext);

  return (
    <>
      <Stack spacing={2} sx={{ mb: 5, position: "relative" }}>
        <Typography variant="h4">Login to Tawk</Typography>
        <Typography variant="body2">
          Sign in using your Keycloak account
        </Typography>
      </Stack>

      {/* Nút đăng nhập Keycloak */}
      <Button
        variant="contained"
        color="primary"
        size="large"
        onClick={login}
      >
        🔐 Login with Keycloak
      </Button>
    </>
  );
}
