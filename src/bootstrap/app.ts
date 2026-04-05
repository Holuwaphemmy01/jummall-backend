import express from "express";
import swaggerUi from "swagger-ui-express";
import openapi from "../infrastructure/api/openapi.json";
import { createAdminModule } from "./admin";
import { createAuthModule } from "./auth";
import { createBuyerModule } from "./buyer";
import { createPaymentModule } from "./payment";
import { createProductModule } from "./product";
import { createSellerModule } from "./seller";
import { createUserModule } from "./user";

const app = express();

app.set("trust proxy", true);
app.use(
  express.json({
    verify: (req, _res, buffer) => {
      (req as typeof req & { rawBody?: string }).rawBody = buffer.toString();
    }
  })
);

app.get("/openapi.json", (req, res) => {
  const serverUrl = `${req.protocol}://${req.get("host")}`;

  return res.status(200).json({
    ...openapi,
    servers: [
      {
        url: serverUrl,
        description: "Current environment"
      }
    ]
  });
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/admin", createAdminModule());
app.use("/auth", createAuthModule());
app.use("/buyers", createBuyerModule());
app.use("/payments", createPaymentModule());
app.use("/products", createProductModule());
app.use("/sellers", createSellerModule());
app.use("/users", createUserModule());

app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(undefined, {
    swaggerOptions: {
      url: "/openapi.json"
    }
  })
);

export default app;
