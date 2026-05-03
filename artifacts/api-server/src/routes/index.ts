import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./panor/auth";
import patientsRouter from "./panor/patients";
import doctorsRouter from "./panor/doctors";
import visitsRouter from "./panor/visits";
import prescriptionsRouter from "./panor/prescriptions";
import labRouter from "./panor/lab";
import appointmentsRouter from "./panor/appointments";
import billingRouter from "./panor/billing";
import epidemiologyRouter from "./panor/epidemiology";
import aiRouter from "./panor/ai";
import dashboardRouter from "./panor/dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(patientsRouter);
router.use(doctorsRouter);
router.use(visitsRouter);
router.use(prescriptionsRouter);
router.use(labRouter);
router.use(appointmentsRouter);
router.use(billingRouter);
router.use(epidemiologyRouter);
router.use(aiRouter);
router.use(dashboardRouter);

export default router;
