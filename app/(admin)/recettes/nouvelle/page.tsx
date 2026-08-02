"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import MealForm from "@/components/admin/MealForm";
import { mealById } from "@/lib/mock/menus";

function NouvelleRecetteForm() {
  const params = useSearchParams();
  const id = params.get("id");
  const meal = id ? mealById(id) : undefined;
  return <MealForm meal={meal} variant="recette" backHref="/recettes" />;
}

export default function NouvelleRecettePage() {
  return (
    <Suspense fallback={null}>
      <NouvelleRecetteForm />
    </Suspense>
  );
}
