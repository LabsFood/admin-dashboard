"use client";

import { Suspense } from "react";
import MealFormRoute from "@/components/admin/MealFormRoute";

export default function NouveauPlatPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-paper" />}>
      <MealFormRoute variant="menu" backHref="/menus" backLabel="Tous les plats" />
    </Suspense>
  );
}
