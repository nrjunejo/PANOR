import { Router } from "express";
import { db } from "@workspace/db";
import { servicePricingTable, billsTable, patientsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

// Service Pricing CRUD
router.get("/finance/pricing", async (req, res) => {
  const { category } = req.query;
  let pricing = await db.select().from(servicePricingTable).orderBy(servicePricingTable.category, servicePricingTable.serviceName);
  if (category) pricing = pricing.filter(p => p.category === category);
  const categories = [...new Set(pricing.map(p => p.category))];
  res.json({ pricing, categories });
});

router.post("/finance/pricing", async (req, res) => {
  const { category, serviceName, serviceCode, basePrice, taxRate, welfareDiscount } = req.body;
  if (!category || !serviceName || !serviceCode || !basePrice) {
    res.status(400).json({ error: "Missing required fields" }); return;
  }
  const [item] = await db.insert(servicePricingTable).values({
    category, serviceName, serviceCode,
    basePrice: String(basePrice),
    taxRate: String(taxRate ?? 0),
    welfareDiscount: String(welfareDiscount ?? 0),
  }).returning();
  res.status(201).json(item);
});

router.patch("/finance/pricing/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { basePrice, taxRate, welfareDiscount, isActive } = req.body;
  const updateData: any = { updatedAt: new Date() };
  if (basePrice !== undefined) updateData.basePrice = String(basePrice);
  if (taxRate !== undefined) updateData.taxRate = String(taxRate);
  if (welfareDiscount !== undefined) updateData.welfareDiscount = String(welfareDiscount);
  if (isActive !== undefined) updateData.isActive = isActive;
  const [updated] = await db.update(servicePricingTable).set(updateData).where(eq(servicePricingTable.id, id)).returning();
  res.json(updated);
});

// Finance billing overview
router.get("/finance/revenue", async (req, res) => {
  const allBills = await db.select().from(billsTable).orderBy(desc(billsTable.createdAt));
  const totalRevenue = allBills.filter(b => b.status === "paid").reduce((s, b) => s + parseFloat(String(b.total ?? 0)), 0);
  const pendingRevenue = allBills.filter(b => b.status === "pending").reduce((s, b) => s + parseFloat(String(b.total ?? 0)), 0);
  const totalTax = allBills.filter(b => b.status === "paid").reduce((s, b) => s + parseFloat(String(b.taxAmount ?? 0)), 0);
  const totalDiscount = allBills.reduce((s, b) => s + parseFloat(String(b.discountAmount ?? 0)), 0);

  const byMethod: Record<string, number> = {};
  allBills.filter(b => b.status === "paid" && b.paymentMethod).forEach(b => {
    const m = b.paymentMethod!;
    byMethod[m] = (byMethod[m] ?? 0) + parseFloat(String(b.total ?? 0));
  });

  const byMonth: Record<string, number> = {};
  allBills.filter(b => b.status === "paid" && b.paidAt).forEach(b => {
    const m = b.paidAt!.toISOString().slice(0, 7);
    byMonth[m] = (byMonth[m] ?? 0) + parseFloat(String(b.total ?? 0));
  });

  res.json({
    totalRevenue, pendingRevenue, totalTax, totalDiscount,
    totalBills: allBills.length,
    paidBills: allBills.filter(b => b.status === "paid").length,
    pendingBills: allBills.filter(b => b.status === "pending").length,
    byPaymentMethod: byMethod,
    monthlyRevenue: Object.entries(byMonth).map(([month, amount]) => ({ month, amount })).sort((a, b) => a.month.localeCompare(b.month)),
  });
});

// Pay a bill
router.post("/finance/bills/:id/pay", async (req, res) => {
  const id = parseInt(req.params.id);
  const { paymentMethod, paymentReference } = req.body;
  if (!paymentMethod) { res.status(400).json({ error: "Payment method required" }); return; }
  const [updated] = await db.update(billsTable).set({
    status: "paid", paidAt: new Date(), paymentMethod, paymentReference: paymentReference ?? null,
  }).where(eq(billsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Bill not found" }); return; }
  const [pat] = await db.select({ name: patientsTable.name }).from(patientsTable).where(eq(patientsTable.id, updated.patientId)).limit(1);
  res.json({ ...updated, patientName: pat?.name ?? "Unknown", createdAt: updated.createdAt?.toISOString(), paidAt: updated.paidAt?.toISOString() });
});

// Create invoice with tax calculation
router.post("/finance/invoices", async (req, res) => {
  const { patientId, visitId, items, welfareDiscount } = req.body;
  if (!patientId || !items?.length) { res.status(400).json({ error: "Patient and items required" }); return; }

  const subtotal = items.reduce((s: number, i: any) => s + Number(i.amount), 0);
  const taxAmount = items.reduce((s: number, i: any) => s + (Number(i.taxAmount) || 0), 0);
  const discountAmount = welfareDiscount ? subtotal * (welfareDiscount / 100) : 0;
  const total = subtotal + taxAmount - discountAmount;

  const invoiceNumber = "INV-" + Date.now().toString(36).toUpperCase();

  const [bill] = await db.insert(billsTable).values({
    patientId, visitId: visitId ?? null,
    invoiceNumber, items,
    subtotal: String(subtotal),
    taxAmount: String(taxAmount),
    discountAmount: String(discountAmount),
    total: String(total),
    status: "pending",
    aiSummary: items.map((i: any) => i.description).join(" + "),
  }).returning();

  const [pat] = await db.select({ name: patientsTable.name }).from(patientsTable).where(eq(patientsTable.id, patientId)).limit(1);
  res.status(201).json({ ...bill, patientName: pat?.name ?? "Unknown", createdAt: bill.createdAt?.toISOString() });
});

export default router;
