import { Router } from "express";
import { db } from "@workspace/db";
import { diseaseClustersTable } from "@workspace/db";
import { GetEpidemiologyClustersQueryParams } from "@workspace/api-zod";
import { like, desc } from "drizzle-orm";

const router = Router();

router.get("/epidemiology/clusters", async (req, res) => {
  const q = GetEpidemiologyClustersQueryParams.safeParse(req.query);
  const { disease } = q.success ? q.data : req.query as any;

  let clusters = await db.select().from(diseaseClustersTable).orderBy(desc(diseaseClustersTable.caseCount));
  if (disease) clusters = clusters.filter(c => c.disease.toLowerCase().includes((disease as string).toLowerCase()));

  const totalCases = clusters.reduce((sum, c) => sum + (c.caseCount ?? 0), 0);
  res.json({
    clusters: clusters.map(c => ({
      ...c,
      lat: parseFloat(String(c.lat)),
      lng: parseFloat(String(c.lng)),
      outbreakProbability: parseFloat(String(c.outbreakProbability)),
      firstDetected: c.firstDetected?.toISOString(),
      lastUpdated: c.lastUpdated?.toISOString(),
    })),
    totalCases,
  });
});

router.get("/epidemiology/trends", async (req, res) => {
  const clusters = await db.select().from(diseaseClustersTable);
  const diseases = [...new Set(clusters.map(c => c.disease))];

  const trends = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    for (const disease of diseases) {
      const cluster = clusters.find(c => c.disease === disease);
      const baseCases = cluster?.caseCount ?? 10;
      const randomVariance = Math.floor(Math.random() * 5) - 2;
      const trend = cluster?.trend;
      const trendFactor = trend === "increasing" ? (30 - i) * 0.1 : trend === "decreasing" ? i * 0.05 : 0;
      trends.push({ date: dateStr, disease, count: Math.max(0, Math.floor(baseCases * 0.3 + trendFactor + randomVariance)) });
    }
  }

  res.json({ trends, diseases });
});

export default router;
