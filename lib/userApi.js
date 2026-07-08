import api from "./api";

export const getProfile = async () => {
  const { data } = await api.get("/users/me");
  return data;
};

export const updateProfile = async (payload) => {
  const { data } = await api.patch("/users/me", payload);
  return data;
};

export const getKycStatus = async () => {
  const { data } = await api.get("/users/me/kyc");
  return data;
};

export const submitKycDocument = async (payload) => {
  const { data } = await api.post("/users/me/kyc/documents", payload);
  return data;
};

export const uploadKycDocument = async ({ documentType, documentNumber, file }) => {
  const formData = new FormData();
  formData.append("documentType", documentType);
  formData.append("documentNumber", documentNumber);
  formData.append("document", file);

  const { data } = await api.post("/users/me/kyc/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const getNotifications = async (params = {}) => {
  const { data } = await api.get("/users/me/notifications", { params });
  return data;
};

export const markNotificationRead = async (id) => {
  const { data } = await api.patch(`/users/me/notifications/${id}/read`);
  return data;
};

export const markAllNotificationsRead = async () => {
  const { data } = await api.patch("/users/me/notifications/read-all");
  return data;
};

export const submitFeedback = async (payload) => {
  const { data } = await api.post("/users/me/feedback", payload);
  return data;
};
