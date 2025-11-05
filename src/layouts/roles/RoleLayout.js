// src/layouts/roles/RoleLayout.js
import React from "react";
import { AppBar, Toolbar, Typography, Box, Avatar, Breadcrumbs, Link, Stack, Divider } from "@mui/material";
import { Outlet, useLocation, Link as RouterLink } from "react-router-dom";
import { styled } from "@mui/material/styles";
import Iconify from "../../components/Iconify";

const Main = styled("main")(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.default,
  minHeight: "100vh",
}));

export default function RoleLayout() {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Header */}
      <AppBar position="static" elevation={1} color="inherit">
        <Toolbar>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ flexGrow: 1 }}>
            <Iconify icon="mdi:shield-account-outline" width={28} color="primary.main" />
            <Typography variant="h6" noWrap>
              Role Dashboard
            </Typography>
            <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
            <Breadcrumbs aria-label="breadcrumb">
              <Link component={RouterLink} underline="hover" color="inherit" to="/">
                Home
              </Link>
              {pathnames.map((value, index) => {
                const to = `/${pathnames.slice(0, index + 1).join("/")}`;
                const isLast = index === pathnames.length - 1;
                return isLast ? (
                  <Typography color="text.primary" key={to}>
                    {value}
                  </Typography>
                ) : (
                  <Link component={RouterLink} underline="hover" color="inherit" to={to} key={to}>
                    {value}
                  </Link>
                );
              })}
            </Breadcrumbs>
          </Stack>

          {/* Avatar user */}
          <Avatar alt="User Avatar" src="/static/avatar_default.jpg" sx={{ width: 40, height: 40 }} />
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Main>
        <Outlet />
      </Main>
    </Box>
  );
}
