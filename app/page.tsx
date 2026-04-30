import { supabase } from "@/lib/supabase";
import type { Restaurant } from "@/lib/types";
import { HomeClient } from "@/components/home-client";

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
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            Food for Thought
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Nutrition info for Singapore restaurants
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <HomeClient restaurants={restaurants} />
      </div>
    </main>
  );
}
