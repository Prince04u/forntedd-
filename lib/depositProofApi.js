import api from "./api";

export const uploadDepositProof = async (file) => {
  const formData = new FormData();
  formData.append("proof", file);

  const { data } = await api.post("/wallet/deposit/proof", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const fetchDepositProofBlobUrl = async (depositId) => {
  const response = await api.get(`/wallet/deposits/${depositId}/proof`, {
    responseType: "blob",
  });
  return URL.createObjectURL(response.data);
};
