import { supabase } from "@/lib/supabase";
import type { Restaurant } from "@/lib/types";
import { HomeClient } from "@/components/home-client";
import { ThemeToggle } from "@/components/theme-toggle";
import { InfoButton } from "@/components/info-sheet";

export const revalidate = 3600;

async function getRestaurants(): Promise<Restaurant[]> {
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .order("tier", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to load restaurants:", error.message);
    return [];
  }
  return data ?? [];
}

export default async function HomePage() {
  const restaurants = await getRestaurants();

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Gradient header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-500 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Food for Thought
            </h1>
            <p className="text-sm text-emerald-100 mt-0.5">
              Nutrition for Singapore
            </p>
          </div>
          <div className="flex items-center gap-2">
            <InfoButton />
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <HomeClient restaurants={restaurants} />
      </div>
    </main>
  );
}
