"use client";

import FormSkeleton from "@/components/admin/FormSkeleton";
import { Suspense } from "react";
import MealFormRoute from "@/components/admin/MealFormRoute";

export default function NouvelleRecettePage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <MealFormRoute variant="recette" backHref="/recettes" backLabel="Toutes les recettes" />
    </Suspense>
  );
}
