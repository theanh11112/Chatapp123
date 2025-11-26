import React, { useState, useEffect } from "react";
import * as Yup from "yup";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Slide,
  Stack,
  CircularProgress,
  Alert,
} from "@mui/material";

import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import FormProvider from "../../components/hook-form/FormProvider";
import { RHFTextField } from "../../components/hook-form";
import RHFAutocomplete from "../../components/hook-form/RHFAutocomplete";
import { useKeycloak } from "@react-keycloak/web";
import api from "../../utils/axios";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const CreateGroupForm = ({ handleClose, users, isLoadingUsers }) => {
  const NewGroupSchema = Yup.object().shape({
    title: Yup.string().required("Title is required"),
    members: Yup.array().min(2, "Must have at least 2 members"),
  });

  const defaultValues = {
    title: "",
    members: [],
  };

  const methods = useForm({
    resolver: yupResolver(NewGroupSchema),
    defaultValues,
  });

  const {
    reset,
    watch,
    handleSubmit,
    formState: { isSubmitting, isValid },
  } = methods;

  // THEO DÕI GIÁ TRỊ MEMBERS ĐỂ DEBUG
  const membersValue = watch("members");
  console.log("🔍 Current members value:", membersValue);

  const onSubmit = async (data) => {
    try {
      console.log("📦 Group Data:", data);

      const groupData = {
        name: data.title,
        members: data.members.map(
          (member) => member.keycloakId || member.value || member
        ),
        isGroup: true,
        createdBy: "currentUserId",
      };

      console.log("🚀 Sending to server:", groupData);

      const response = await api.post("/users/creats/group", groupData);

      if (response.data.status === "success") {
        console.log("✅ Group created successfully:", response.data);
        handleClose();
        reset();
      } else {
        console.error("❌ Failed to create group:", response.data.message);
      }
    } catch (error) {
      console.error("❌ Error creating group:", error);
    }
  };

  return (
    <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={2.5} sx={{ pt: 0.5 }}>
        <RHFTextField
          name="title"
          label="Group Name"
          fullWidth
          variant="outlined"
          size="small"
          sx={{
            "& .MuiInputLabel-root": {
              transform: "translate(14px, 9px) scale(1)",
              "&.MuiInputLabel-shrink": {
                transform: "translate(14px, -9px) scale(0.75)",
              },
              "&.Mui-focused": {
                color: "primary.main",
              },
            },
            "& .MuiOutlinedInput-root": {
              fontSize: "0.875rem",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "divider",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "primary.light",
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "primary.main",
                borderWidth: 1.5,
              },
            },
          }}
        />

        {isLoadingUsers ? (
          <Stack alignItems="center" spacing={1} sx={{ py: 1 }}>
            <CircularProgress size={20} />
            <div style={{ fontSize: "0.875rem" }}>Loading users...</div>
          </Stack>
        ) : (
          <RHFAutocomplete
            name="members"
            label="Members"
            multiple
            size="small"
            options={users}
            getOptionLabel={(option) => {
              // FIX: Xử lý cả string và object
              if (typeof option === "string") {
                return option;
              }
              return (
                option.name || option.email || option.keycloakId || "Unknown"
              );
            }}
            isOptionEqualToValue={(option, value) => {
              // FIX: So sánh đúng cách
              if (typeof option === "string" || typeof value === "string") {
                return option === value;
              }
              return (
                option.keycloakId === value.keycloakId ||
                option.id === value.id ||
                option._id === value._id
              );
            }}
            ChipProps={{
              size: "small",
              sx: { fontSize: "0.75rem" },
            }}
            loading={isLoadingUsers}
            // THÊM: Filter options để tránh trùng lặp
            filterSelectedOptions
            // THÊM: Giữ giá trị khi có lỗi
            disableCloseOnSelect
            sx={{
              "& .MuiInputLabel-root": {
                transform: "translate(14px, 9px) scale(1)",
                "&.MuiInputLabel-shrink": {
                  transform: "translate(14px, -9px) scale(0.75)",
                },
                "&.Mui-focused": {
                  color: "primary.main",
                },
              },
              "& .MuiOutlinedInput-root": {
                fontSize: "0.875rem",
                minHeight: "40px",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "divider",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "primary.light",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "primary.main",
                  borderWidth: 1.5,
                },
              },
            }}
          />
        )}

        <Stack
          spacing={1.5}
          direction={"row"}
          alignItems="center"
          justifyContent={"end"}
          sx={{ mt: 3 }}
        >
          <Button
            onClick={handleClose}
            disabled={isSubmitting}
            variant="outlined"
            size="small"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || !isValid}
            size="small"
          >
            {isSubmitting ? "Creating..." : "Create"}
          </Button>
        </Stack>
      </Stack>
    </FormProvider>
  );
};

const CreateGroup = ({ open, handleClose }) => {
  const { keycloak } = useKeycloak();
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [error, setError] = useState(null);

  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      setError(null);
      console.log("🔍 Fetching users from server...");

      const response = await api.get("/users/get-users");

      if (response.data.status === "success") {
        const usersData = response.data.data || [];
        console.log(`✅ Found ${usersData.length} users:`, usersData);

        // FIX: Đảm bảo mỗi user có id và keycloakId - SỬA LỖI SYNTAX
        const processedUsers = usersData.map((user) => {
          // SỬA: Sử dụng Object.assign thay vì spread operator bị lỗi
          const processedUser = Object.assign({}, user);
          processedUser.id = user.id || user._id || user.keycloakId;
          processedUser.keycloakId = user.keycloakId || user.id;
          return processedUser;
        });

        setUsers(processedUsers);
      } else {
        console.error("❌ Failed to fetch users:", response.data.message);
        setError(response.data.message || "Failed to load users");
      }
    } catch (error) {
      console.error("❌ Error fetching users:", error);
      setError("Cannot connect to server");

      // FIX: Mock data với đầy đủ thuộc tính
      const mockUsers = [
        {
          id: "1",
          _id: "1",
          keycloakId: "user1",
          name: "John Doe",
          email: "john@example.com",
        },
        {
          id: "2",
          _id: "2",
          keycloakId: "user2",
          name: "Jane Smith",
          email: "jane@example.com",
        },
        {
          id: "3",
          _id: "3",
          keycloakId: "user3",
          name: "Bob Johnson",
          email: "bob@example.com",
        },
      ];
      setUsers(mockUsers);
      console.log("🔄 Using fallback mock data");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  return (
    <Dialog
      fullWidth
      maxWidth="sm"
      open={open}
      TransitionComponent={Transition}
      keepMounted
      onClose={handleClose}
      sx={{
        "& .MuiDialog-paper": {
          borderRadius: 1.5,
          boxShadow: 12,
          width: "420px",
          maxWidth: "90vw",
          margin: 1,
          minHeight: "250px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <DialogTitle
        sx={{
          pb: 1.5,
          pt: 2.5,
          borderBottom: 1,
          borderColor: "divider",
          fontSize: "1.1rem",
          fontWeight: 600,
          textAlign: "center",
          px: 2,
        }}
      >
        Create New Group
      </DialogTitle>

      <DialogContent
        sx={{
          p: 2.5,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          "& .MuiFormControl-root": {
            marginTop: "6px !important",
            marginBottom: "6px !important",
          },
        }}
      >
        {error && (
          <Alert
            severity="warning"
            sx={{
              mb: 2,
              fontSize: "0.8rem",
              py: 0.5,
            }}
          >
            {error} - Using demo data
          </Alert>
        )}

        <div style={{ flex: 1 }}>
          <CreateGroupForm
            handleClose={handleClose}
            users={users}
            isLoadingUsers={isLoadingUsers}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroup;
