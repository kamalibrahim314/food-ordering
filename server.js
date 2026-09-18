import app from "./src/app.controller.js";

const PORT = process.env.PORT || 5000;

if (process.env.VERCEL !== "1") {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}

export default app;
