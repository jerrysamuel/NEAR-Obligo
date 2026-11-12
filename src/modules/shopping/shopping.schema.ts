import { z } from "zod";

export const ShoppingSearchSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  maxPrice: z.number().optional(),
  category: z.string().optional(),
});

export const PreparePurchaseSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.number().int().positive().default(1),
});

export const SaveProductSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  notes: z.string().optional(),
});
