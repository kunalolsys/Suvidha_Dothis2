let accessToken = null;

export const setAccessToken = (token) => {
  accessToken = token;
  localStorage.setItem("accessToken", token);
};

export const getAccessToken = () => {
  return accessToken || localStorage.getItem("accessToken");
};

export const clearAccessToken = () => {
  accessToken = null;
  localStorage.removeItem("accessToken");
};
