import express from "express";
import analyticsRouter from "./analytics";

const router = express.Router();

router.use("/analytics", analyticsRouter);

export default router;