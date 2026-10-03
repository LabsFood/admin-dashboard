"use client";

import { Suspense } from "react";
import MealFormRoute from "@/components/admin/MealFormRoute";

export default function NouvelleRecettePage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-paper" />}>
      <MealFormRoute variant="recette" backHref="/recettes" backLabel="Toutes les recettes" />
    </Suspense>
  );
}
