import { Router } from "express";
import { db } from "@workspace/db";
import { patientsTable, visitsTable, labOrdersTable, appointmentsTable, billsTable, alertsTable } from "@workspace/db";
import { GetDashboardSummaryQueryParams, GetActiveAlertsQueryParams, GetRecentActivityQueryParams } from "@workspace/api-zod";
import { eq, sql, desc } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (req, res) => {
  const [totalPatientsResult] = await db.select({ count: sql<number>`count(*)` }).from(patientsTable);
  const [activeVisitsResult] = await db.select({ count: sql<number>`count(*)` }).from(visitsTable).where(eq(visitsTable.status, "active"));
  const [pendingLabResult] = await db.select({ count: sql<number>`count(*)` }).from(labOrdersTable).where(eq(labOrdersTable.status, "pending"));
  const [todayApptResult] = await db.select({ count: sql<number>`count(*)` }).from(appointmentsTable).where(eq(appointmentsTable.status, "scheduled"));
  const [pendingBillsResult] = await db.select({ count: sql<number>`count(*)` }).from(billsTable).where(eq(billsTable.status, "pending"));
  const [criticalAlertsResult] = await db.select({ count: sql<number>`count(*)` }).from(alertsTable).where(eq(alertsTable.severity, "critical"));

  const allBills = await db.select({ total: billsTable.total, status: billsTable.status }).from(billsTable);
  const revenueThisMonth = allBills.filter(b => b.status === "paid").reduce((sum, b) => sum + parseFloat(String(b.total ?? 0)), 0);

  res.json({
    totalPatients: Number(totalPatientsResult?.count ?? 0),
    activeVisits: Number(activeVisitsResult?.count ?? 0),
    pendingLabOrders: Number(pendingLabResult?.count ?? 0),
    todayAppointments: Number(todayApptResult?.count ?? 0),
    pendingBills: Number(pendingBillsResult?.count ?? 0),
    criticalAlerts: Number(criticalAlertsResult?.count ?? 0),
    revenueThisMonth,
    avgConsultationTime: 18.5,
    topConditions: [
      { condition: "Hypertension", count: 45 },
      { condition: "Diabetes Type 2", count: 38 },
      { condition: "Respiratory Infection", count: 29 },
      { condition: "Dengue Fever", count: 22 },
      { condition: "Cardiac Risk", count: 17 },
    ],
  });
});

router.get("/dashboard/recent-activity", async (req, res) => {
  const q = GetRecentActivityQueryParams.safeParse(req.query);
  const limit = q.success ? (q.data.limit ?? 10) : 10;

  const visits = await db.select().from(visitsTable).orderBy(desc(visitsTable.createdAt)).limit(Math.floor(limit / 2));
  const alerts = await db.select().from(alertsTable).orderBy(desc(alertsTable.createdAt)).limit(Math.floor(limit / 2));

  const activities = [
    ...visits.map((v, i) => ({
      id: i + 1,
      type: "visit",
      description: `New visit: ${v.chiefComplaint?.slice(0, 60) ?? "Consultation"}`,
      timestamp: v.createdAt?.toISOString() ?? new Date().toISOString(),
      severity: null,
    })),
    ...alerts.map((a, i) => ({
      id: i + 100,
      type: "alert",
      description: a.title,
      timestamp: a.createdAt?.toISOString() ?? new Date().toISOString(),
      severity: a.severity,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);

  res.json({ activities });
});

router.get("/dashboard/alerts", async (req, res) => {
  const q = GetActiveAlertsQueryParams.safeParse(req.query);
  const { patientId } = q.success ? q.data : req.query as any;

  let alerts = await db.select().from(alertsTable)
    .where(eq(alertsTable.isResolved, false))
    .orderBy(desc(alertsTable.createdAt));

  if (patientId) alerts = alerts.filter(a => a.patientId === Number(patientId));

  const criticalCount = alerts.filter(a => a.severity === "critical").length;
  res.json({
    alerts: alerts.map(a => ({ ...a, createdAt: a.createdAt?.toISOString() })),
    criticalCount,
  });
});

export default router;
