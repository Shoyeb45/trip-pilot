import { Toaster as SonnerToaster } from "sonner";

export const Toaster = () => (
  <SonnerToaster
    position="bottom-center"
    richColors
    duration={4000}
    toastOptions={{
      style: {
        maxWidth: "400px",
        minWidth: "300px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        borderRadius: "8px",
        fontSize: "13px",
        fontWeight: "500",
        padding: "12px 16px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
      },
      className: "custom-toast",
    }}
  />
);
