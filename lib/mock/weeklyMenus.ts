import type { WeeklyMenu } from "./types";

export const WEEKLY_MENUS: WeeklyMenu[] = [
  {
    id: "menu_w21",
    title: "Menu de la semaine 21",
    weekNumber: 21,
    startDate: "2026-05-18",
    endDate: "2026-05-24",
    mealIds: [
      "meal_01",
      "meal_02",
      "meal_03",
      "meal_04",
      "meal_05",
      "meal_06",
      "meal_07",
      "meal_12",
    ],
    status: "published",
  },
  {
    id: "menu_w22",
    title: "Menu de la semaine 22",
    weekNumber: 22,
    startDate: "2026-05-25",
    endDate: "2026-05-31",
    mealIds: ["meal_08", "meal_09", "meal_11"],
    status: "draft",
  },
  {
    id: "menu_w20",
    title: "Menu de la semaine 20",
    weekNumber: 20,
    startDate: "2026-05-11",
    endDate: "2026-05-17",
    mealIds: ["meal_10"],
    status: "archived",
  },
];

export function weeklyMenuById(id: string): WeeklyMenu | undefined {
  return WEEKLY_MENUS.find((m) => m.id === id);
}
