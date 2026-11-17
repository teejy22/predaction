import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sportsRouter from "./sports";
import flowframeRouter from "./flowframe";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sportsRouter);
router.use(flowframeRouter);

export default router;
