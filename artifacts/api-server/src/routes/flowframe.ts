import { Router, type IRouter } from "express";
import { GetFlowframeInsightsResponse } from "@workspace/api-zod";
import { flowframe } from "../lib/flowframe";

const router: IRouter = Router();
router.get("/flowframe/insights", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(GetFlowframeInsightsResponse.parse(await flowframe.insights()));
});
export default router;
