import express from "express";
import swaggerUi from "swagger-ui-express";
import openapi from "../infrastructure/api/openapi.json";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));

export default app;
