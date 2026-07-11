import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

export async function GET() {
  const user = await requireAdmin();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const submissions = await sql`
      SELECT *
      FROM restaurant_submissions
      ORDER BY created_at DESC
    `;

    return NextResponse.json(submissions);
  } catch (error) {
    console.error("Failed to load restaurant submissions:", error);

    return NextResponse.json(
      { error: "Failed to load submissions" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const user = await requireAdmin();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { id, status, admin_notes } = body;

    await sql`
      UPDATE restaurant_submissions
      SET
        status = ${status},
        admin_notes = ${admin_notes || null},
        reviewed_at = NOW()
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update restaurant submission:", error);

    return NextResponse.json(
      { error: "Failed to update submission" },
      { status: 500 }
    );
  }
}

type ExtractGroup = {
  name: string;
  ui_hint: string;
  max_selections: number;
  options: {
    name: string;
    price_delta_sgd: number;
  }[];
};

type ExtractDish = {
  name: string;
  category: string | null;
};

type MenuExtract = {
  menu_type?: string;
  meal_structure?: string;
  dishes?: ExtractDish[];
  customisation_groups?: ExtractGroup[];
};

export async function POST(req: NextRequest) {
  const user = await requireAdmin();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();

    const {
      submission_id,
      name,
      slug,
      cuisine_tags,
      location_tags,
      tier,
      edited_dishes,
      edited_groups,
    } = body;

    const restaurantRows = await sql`
      INSERT INTO restaurants (
        name,
        slug,
        cuisine_tags,
        location_tags,
        tier
      )
      VALUES (
        ${name},
        ${slug},
        ${cuisine_tags},
        ${location_tags},
        ${tier ?? 3}
      )
      RETURNING *
    `;

    const restaurant = restaurantRows[0];

    const submissionRows = await sql`
      SELECT ai_extracted_dishes
      FROM restaurant_submissions
      WHERE id = ${submission_id}
      LIMIT 1
    `;

    const rawExtract =
      submissionRows[0]?.ai_extracted_dishes ?? null;

    const extract = rawExtract as MenuExtract | ExtractDish[] | null;

    const isBuildYourOwn =
      extract !== null &&
      !Array.isArray(extract) &&
      extract.menu_type === "build_your_own";

    if (isBuildYourOwn && !Array.isArray(extract)) {
      const menuItemRows = await sql`
        INSERT INTO menu_items (
          restaurant_id,
          name,
          description,
          category,
          has_customisation,
          is_available,
          data_source,
          display_order
        )
        VALUES (
          ${restaurant.id},
          'Build Your Own',
          ${extract.meal_structure || null},
          'Customise',
          true,
          true,
          'crowdsourced',
          0
        )
        RETURNING id
      `;

      const menuItem = menuItemRows[0];

      const groups: ExtractGroup[] =
        edited_groups ??
        extract.customisation_groups ??
        [];

      for (let gi = 0; gi < groups.length; gi++) {
        const group = groups[gi];

        const groupRows = await sql`
          INSERT INTO customisation_groups (
            menu_item_id,
            restaurant_id,
            name,
            ui_hint,
            min_selections,
            max_selections,
            display_order
          )
          VALUES (
            ${menuItem.id},
            ${restaurant.id},
            ${group.name},
            ${group.ui_hint},
            ${
              group.ui_hint === "pick_one_required"
                ? 1
                : 0
            },
            ${
              group.ui_hint === "pick_many"
                ? null
                : group.max_selections || null
            },
            ${gi}
          )
          RETURNING id
        `;

        const insertedGroup = groupRows[0];

        for (
          let oi = 0;
          oi < (group.options ?? []).length;
          oi++
        ) {
          const option = group.options[oi];

          await sql`
            INSERT INTO customisation_options (
              group_id,
              name,
              price_delta_sgd,
              display_order
            )
            VALUES (
              ${insertedGroup.id},
              ${option.name},
              ${option.price_delta_sgd || null},
              ${oi}
            )
          `;
        }
      }
    } else {
      const dishes: ExtractDish[] =
        edited_dishes?.length
          ? edited_dishes
          : Array.isArray(extract)
            ? extract
            : extract?.dishes ?? [];

      for (let i = 0; i < dishes.length; i++) {
        const dish = dishes[i];

        await sql`
          INSERT INTO menu_items (
            restaurant_id,
            name,
            category,
            has_customisation,
            is_available,
            data_source,
            display_order
          )
          VALUES (
            ${restaurant.id},
            ${dish.name},
            ${dish.category ?? "Menu"},
            false,
            true,
            'crowdsourced',
            ${i}
          )
        `;
      }
    }

    await sql`
      UPDATE restaurant_submissions
      SET
        status = 'approved',
        reviewed_at = NOW()
      WHERE id = ${submission_id}
    `;

    revalidatePath("/");
    revalidatePath(`/restaurants/${restaurant.slug}`);

    return NextResponse.json({
      success: true,
      restaurant,
      is_build_your_own: isBuildYourOwn,
    });
  } catch (error) {
    console.error("Restaurant approval failed:", error);

    return NextResponse.json(
      { error: "Restaurant approval failed" },
      { status: 500 }
    );
  }
}