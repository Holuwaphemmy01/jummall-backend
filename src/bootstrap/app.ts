import express from "express";
import swaggerUi from "swagger-ui-express";
import openapi from "../infrastructure/api/openapi.json";
import { createAuthModule } from "./auth";
import { createBuyerModule } from "./buyer";
import { createSellerModule } from "./seller";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/auth", createAuthModule());
app.use("/buyers", createBuyerModule());
app.use("/sellers", createSellerModule());

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));

export default app;
