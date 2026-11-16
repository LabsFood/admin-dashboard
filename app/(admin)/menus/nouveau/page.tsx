"use client";

import FormSkeleton from "@/components/admin/FormSkeleton";
import { Suspense } from "react";
import MealFormRoute from "@/components/admin/MealFormRoute";

export default function NouveauPlatPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <MealFormRoute variant="menu" backHref="/menus" backLabel="Tous les plats" />
    </Suspense>
  );
}
