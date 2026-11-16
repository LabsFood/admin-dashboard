"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { fade } from "@/lib/motion";

export default function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    // fréquence d'usage : une console ne fait pas d'entrée, un fondu de 160 ms suffit
    <motion.div {...fade} className={className}>
      {children}
    </motion.div>
  );
}
