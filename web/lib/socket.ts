"use client";

import { io, Socket } from "socket.io-client";
import { API_URL } from "@/lib/api";
import type { PassportUpdate } from "@/types/passport";

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) socket = io(API_URL, { path: "/socket.io", transports: ["websocket", "polling"] });
  return socket;
}

export function onPassport(cb: (update: PassportUpdate) => void) {
  const s = getSocket();
  s.on("passport-updated", cb);
  return () => {
    s.off("passport-updated", cb);
  };
}
