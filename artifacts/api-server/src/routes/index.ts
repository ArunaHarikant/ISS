import { Router, type IRouter } from "express";
import healthRouter from "./health";
import issRouter from "./iss";
import openaiRouter from "./openai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(issRouter);
router.use(openaiRouter);

export default router;
