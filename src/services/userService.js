// src/services/userService.js
import api from "../utils/axios";

/**
 * Service để lấy thông tin user từ keycloak ID
 */
class UserService {
  /**
   * Lấy thông tin user bằng keycloak ID
   * @param {string} keycloakId
   * @returns {Promise<Object>} Thông tin user
   */
  async getUserById(keycloakId) {
    try {
      if (!keycloakId) {
        console.warn("❌ Keycloak ID is required");
        return null;
      }

      console.log("🔍 Fetching user info for:", keycloakId);

      // Gọi API để lấy thông tin user
      const response = await api.post("/users/get-users", {
        // Có thể thêm các filter nếu cần
      });

      if (response.data.status === "success" && response.data.data) {
        // Tìm user trong danh sách trả về
        const user = response.data.data.find(
          (user) => user.keycloakId === keycloakId
        );

        if (user) {
          console.log("✅ User found:", user.username);
          return this.formatUserInfo(user);
        } else {
          console.warn("❌ User not found with keycloakId:", keycloakId);
          return this.getFallbackUserInfo(keycloakId);
        }
      }

      return this.getFallbackUserInfo(keycloakId);
    } catch (error) {
      console.error("❌ Error fetching user info:", error);
      return this.getFallbackUserInfo(keycloakId);
    }
  }

  /**
   * Lấy thông tin nhiều users bằng danh sách keycloak IDs
   * @param {string[]} keycloakIds
   * @returns {Promise<Object[]>} Danh sách thông tin users
   */
  async getUsersByIds(keycloakIds) {
    try {
      if (
        !keycloakIds ||
        !Array.isArray(keycloakIds) ||
        keycloakIds.length === 0
      ) {
        return [];
      }

      console.log("🔍 Fetching multiple users info:", keycloakIds);

      // Gọi API để lấy danh sách users
      const response = await api.post("/users/get-users", {
        // Có thể thêm filter nếu backend hỗ trợ
      });

      if (response.data.status === "success" && response.data.data) {
        const usersMap = new Map();

        // Tạo map để tra cứu nhanh
        response.data.data.forEach((user) => {
          usersMap.set(user.keycloakId, this.formatUserInfo(user));
        });

        // Lấy thông tin users theo IDs được yêu cầu
        const result = keycloakIds.map((id) => {
          const user = usersMap.get(id);
          return user || this.getFallbackUserInfo(id);
        });

        console.log(
          `✅ Found ${
            result.filter((u) => u.keycloakId !== "unknown").length
          } users`
        );
        return result;
      }

      return keycloakIds.map((id) => this.getFallbackUserInfo(id));
    } catch (error) {
      console.error("❌ Error fetching multiple users info:", error);
      return keycloakIds.map((id) => this.getFallbackUserInfo(id));
    }
  }

  /**
   * Tìm kiếm users theo từ khóa
   * @param {string} query
   * @returns {Promise<Object[]>} Danh sách users tìm thấy
   */
  async searchUsers(query) {
    try {
      if (!query || query.length < 2) {
        return [];
      }

      console.log("🔍 Searching users:", query);

      const response = await api.get(
        `/users/search?q=${encodeURIComponent(query)}`
      );

      if (response.data.status === "success" && response.data.data) {
        const users = response.data.data.map((user) =>
          this.formatUserInfo(user)
        );
        console.log(`✅ Found ${users.length} users for query: ${query}`);
        return users;
      }

      return [];
    } catch (error) {
      console.error("❌ Error searching users:", error);
      return [];
    }
  }

  /**
   * Định dạng thông tin user
   * @param {Object} user
   * @returns {Object} Thông tin user đã định dạng
   */
  formatUserInfo(user) {
    if (!user) return this.getFallbackUserInfo();

    return {
      keycloakId: user.keycloakId,
      username: user.username || "Unknown User",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      fullName: this.getFullName(user),
      email: user.email || "",
      avatar: user.avatar || "/default-avatar.png",
      status: user.status || "Offline",
      lastSeen: user.lastSeen || new Date(),
      isActive: user.isActive !== undefined ? user.isActive : true,
      roles: user.roles || ["user"],
    };
  }

  /**
   * Lấy tên đầy đủ của user
   * @param {Object} user
   * @returns {string}
   */
  getFullName(user) {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) {
      return user.firstName;
    }
    if (user.lastName) {
      return user.lastName;
    }
    return user.username || "Unknown User";
  }

  /**
   * Thông tin user fallback khi không tìm thấy
   * @param {string} keycloakId
   * @returns {Object}
   */
  getFallbackUserInfo(keycloakId = "unknown") {
    return {
      keycloakId: keycloakId,
      username: "Unknown User",
      firstName: "Unknown",
      lastName: "User",
      fullName: "Unknown User",
      email: "",
      avatar: "/default-avatar.png",
      status: "Offline",
      lastSeen: new Date(),
      isActive: false,
      roles: ["user"],
    };
  }

  /**
   * Lấy thông tin user hiện tại (current user)
   * @returns {Promise<Object>}
   */
  async getCurrentUser() {
    try {
      const response = await api.get("/users/me");

      if (response.data.status === "success" && response.data.data) {
        return this.formatUserInfo(response.data.data);
      }

      return this.getFallbackUserInfo();
    } catch (error) {
      console.error("❌ Error fetching current user:", error);
      return this.getFallbackUserInfo();
    }
  }
}

// Tạo instance
const userService = new UserService();

export default userService;
