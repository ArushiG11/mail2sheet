import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import SignIn from "./pages/SignIn";
import AuthCallback from "./pages/AuthCallback";
import App from "./App";

const router = createBrowserRouter([
  { path: "/", element: <SignIn /> },
  { path: "/auth/callback", element: <AuthCallback /> },
  { path: "/app", element: <App /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><RouterProvider router={router} /></React.StrictMode>
);
