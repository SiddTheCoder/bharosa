"use client";

import { useState } from "react";
import { Provider } from "react-redux";
import { makeStore } from "./index";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializer runs exactly once, creating a single store per client.
  const [store] = useState(makeStore);
  return <Provider store={store}>{children}</Provider>;
}
