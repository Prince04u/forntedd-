import { getToken } from "./auth";
import { getSocketUrl } from "./serviceOrigin";

let socket = null;
let socketPromise = null;

export const getSocket = async () => {
  if (typeof window === "undefined") {
    return null;
  }

  if (socket) {
    return socket;
  }

  if (!socketPromise) {
    socketPromise = import("socket.io-client").then(({ io }) => {
      const url = getSocketUrl();

      socket = io(url, {
        auth: { token: getToken() },
        transports: ["websocket", "polling"],
      });

      return socket;
    });
  }

  return socketPromise;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    socketPromise = null;
  }
};
