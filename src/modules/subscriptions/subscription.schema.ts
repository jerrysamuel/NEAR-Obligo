import { z } from "zod";

export const SubscriptionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  provider: z.string().min(1, "Provider is required"),
  category: z.string().min(1, "Category is required"),
  amount: z.number().positive("Amount must be greater than zero"),
  currency: z.string().default("NGN"),
  billingCycle: z.enum(["weekly", "monthly", "quarterly", "yearly"]),
  startDate: z.string().optional(),
  nextBillingDate: z.string().min(1, "Next billing date is required"),
  status: z.enum(["active", "paused", "cancelled"]).default("active"),
  notes: z.string().optional(),
});

export const SubscriptionUpdateSchema = SubscriptionSchema.partial();
