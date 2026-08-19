import React from "react";
import AuthForm from "@/components/AuthForm";

export default function Page() {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundImage: "url('/poultry-farmer-background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#2d5a1b", // fallback green
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <AuthForm type="sign-in" />
    </div>
  );
}