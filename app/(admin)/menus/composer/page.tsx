"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import MenuForm from "@/components/admin/MenuForm";
import { weeklyMenuById } from "@/lib/mock/weeklyMenus";

function ComposerForm() {
  const params = useSearchParams();
  const id = params.get("id");
  const menu = id ? weeklyMenuById(id) : undefined;
  return <MenuForm menu={menu} />;
}

export default function ComposerMenuPage() {
  return (
    <Suspense fallback={null}>
      <ComposerForm />
    </Suspense>
  );
}
