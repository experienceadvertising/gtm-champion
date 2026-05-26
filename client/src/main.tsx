import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { installPremiumInterceptor } from "./lib/premiumInterceptor";

installPremiumInterceptor();

createRoot(document.getElementById("root")!).render(<App />);
