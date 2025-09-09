import { toast } from "svelte-sonner";

/**
 * Global error handler that captures unhandled errors and displays them via toast
 * while preserving console logging
 */
export function setupGlobalErrorHandler() {
    // Handle unhandled JavaScript errors
    window.addEventListener("error", (event) => {
        const { message, filename, lineno, colno, error } = event;

        // Log to console (preserve original behavior)
        console.error("Unhandled error:", {
            message,
            filename,
            line: lineno,
            column: colno,
            error,
        });

        // Show toast notification
        toast.error(`Error`, {
            description: message,
            duration: 15000,
        });
    });

    // Handle unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
        const { reason } = event;

        // Log to console (preserve original behavior)
        console.error("Unhandled promise rejection:", reason);

        // Show toast notification
        const errorMessage =
            reason instanceof Error ? reason.message : String(reason);
        toast.error("Promise Rejection", {
            description: errorMessage,
            duration: 5000,
        });
    });

    console.log("Global error handler initialized");
}

/**
 * Utility function to manually trigger error toast while logging to console
 */
export function handleError(error: Error | string, context?: string) {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Log to console
    console.error(context ? `${context}:` : "Error:", errorMessage);
    if (errorStack) {
        console.error("Stack trace:", errorStack);
    }

    // Show toast notification
    toast.error(context || "Error", {
        description: errorMessage,
        duration: 5000,
    });
}
