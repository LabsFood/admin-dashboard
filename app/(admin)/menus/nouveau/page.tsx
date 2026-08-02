"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import MealForm from "@/components/admin/MealForm";
import { mealById } from "@/lib/mock/menus";

function NouveauPlatForm() {
  const params = useSearchParams();
  const id = params.get("id");
  const meal = id ? mealById(id) : undefined;
  return <MealForm meal={meal} variant="menu" backHref="/menus" />;
}

export default function NouveauPlatPage() {
  return (
    <Suspense fallback={null}>
      <NouveauPlatForm />
    </Suspense>
  );
}
