import { Router, type IRouter } from "express";
import { GetFlowframeInsightsResponse, GetFlowframeToolsResponse } from "@workspace/api-zod";
import { flowframe } from "../lib/flowframe";

const router: IRouter = Router();
router.get("/flowframe/tools", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(GetFlowframeToolsResponse.parse(await flowframe.tools()));
});
router.get("/flowframe/insights", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(GetFlowframeInsightsResponse.parse(await flowframe.insights()));
});
export default router;
