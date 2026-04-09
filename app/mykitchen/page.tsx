import UserInfo from "@/components/dashboard/UserInfo";
import DailyTracking from "@/components/dashboard/DailyTracking";
import MealPlan from "@/components/dashboard/MealPlan";
import QuickSnackGen from "@/components/dashboard/QuickSnack"

import {
  ChefHat,
  FileText,
  Heart,
  MapPinned,
  Salad,
  Soup,
  SquareChartGantt,
  UtensilsCrossed,
  WalletCards,
  Wheat,
  LogOut,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: SquareChartGantt, active: true },
  { label: "My Kitchen", icon: ChefHat },
  { label: "Recipes", icon: FileText },
  { label: "Meal Plan", icon: UtensilsCrossed },
  { label: "Budget", icon: WalletCards },
  { label: "Preferences", icon: Heart },
  { label: "Community", icon: MapPinned },
];

const meals = [
  { label: "Breakfast", detail: "breakfast", icon: Wheat },
  { label: "Lunch", detail: "lunch", icon: Salad },
  { label: "Dinner", detail: "dinner", icon: Soup },
];

