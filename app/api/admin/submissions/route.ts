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
      SELECT
        cs.*,
        json_build_object(
          'name', r.name,
          'slug', r.slug
        ) AS restaurants
      FROM crowdsource_submissions cs
      LEFT JOIN restaurants r
        ON r.id = cs.restaurant_id
      ORDER BY cs.created_at DESC
    `;

    return NextResponse.json(submissions);
  } catch (error) {
    console.error("Failed to load submissions:", error);

    return NextResponse.json(
      { error: "Failed to load submissions" },
      { status: 500 }
    );
  }
}

type IngredientDeltaRow = {
  group_name: string;
  option_name: string;
  option_id?: string | null;
  calories_delta: number;
  protein_delta_g: number;
  carbs_delta_g: number;
  fat_delta_g: number;
  fibre_delta_g: number;
  sugar_delta_g: number;
  sat_fat_delta_g: number;
  sodium_delta_mg: number;
};

type ApprovedSubmissionRow = {
  ai_ingredient_deltas: IngredientDeltaRow[] | null;
};

type GroupRow = {
  id: string;
  name: string;
};

type OptionRow = {
  id: string;
  group_id: string;
  name: string;
};

function mean(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
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

    const {
      id,
      status,
      admin_notes,
      admin_calories,
      admin_protein_g,
      admin_carbs_g,
      admin_fat_g,
      admin_sodium_mg,
      ingredient_deltas,
    } = body;

    const isBYOApproval =
      status === "approved" &&
      Array.isArray(ingredient_deltas) &&
      ingredient_deltas.length > 0;

    let extraResponse: Record<string, unknown> = {};

    await sql`
      UPDATE crowdsource_submissions
      SET
        status = ${status},
        admin_notes = ${admin_notes ?? null},
        admin_calories = ${admin_calories ?? null},
        admin_protein_g = ${admin_protein_g ?? null},
        admin_carbs_g = ${admin_carbs_g ?? null},
        admin_fat_g = ${admin_fat_g ?? null},
        admin_sodium_mg = ${admin_sodium_mg ?? null},
        ai_ingredient_deltas = CASE
          WHEN ${isBYOApproval}
          THEN ${JSON.stringify(
            ingredient_deltas ?? []
          )}::jsonb
          ELSE ai_ingredient_deltas
        END,
        reviewed_at = NOW()
      WHERE id = ${id}
    `;

    if (isBYOApproval) {
      const submissionRows = await sql`
        SELECT restaurant_id, menu_item_id
        FROM crowdsource_submissions
        WHERE id = ${id}
        LIMIT 1
      `;

      const submission = submissionRows[0] as
        | {
            restaurant_id: string | null;
            menu_item_id: string | null;
          }
        | undefined;

      if (submission?.restaurant_id) {
        const approvedRows = await sql`
          SELECT ai_ingredient_deltas
          FROM crowdsource_submissions
          WHERE restaurant_id = ${submission.restaurant_id}
            AND status = 'approved'
            AND ai_ingredient_deltas IS NOT NULL
        `;

        const allApproved =
          approvedRows as ApprovedSubmissionRow[];

        const agg: Record<
          string,
          Record<
            string,
            {
              option_id: string | null;
              cal: number[];
              prot: number[];
              carbs: number[];
              fat: number[];
              fibre: number[];
              sugar: number[];
              sat_fat: number[];
              sodium: number[];
            }
          >
        > = {};

        for (const sub of allApproved) {
          for (const d of sub.ai_ingredient_deltas ?? []) {
            if (!agg[d.group_name]) {
              agg[d.group_name] = {};
            }

            if (!agg[d.group_name][d.option_name]) {
              agg[d.group_name][d.option_name] = {
                option_id: d.option_id ?? null,
                cal: [],
                prot: [],
                carbs: [],
                fat: [],
                fibre: [],
                sugar: [],
                sat_fat: [],
                sodium: [],
              };
            } else if (
              !agg[d.group_name][d.option_name].option_id &&
              d.option_id
            ) {
              agg[d.group_name][d.option_name].option_id =
                d.option_id;
            }

            const a = agg[d.group_name][d.option_name];

            a.cal.push(d.calories_delta);
            a.prot.push(d.protein_delta_g);
            a.carbs.push(d.carbs_delta_g);
            a.fat.push(d.fat_delta_g);
            a.fibre.push(d.fibre_delta_g);
            a.sugar.push(d.sugar_delta_g);
            a.sat_fat.push(d.sat_fat_delta_g);
            a.sodium.push(d.sodium_delta_mg);
          }
        }

        const groupRows = await sql`
          SELECT id, name
          FROM customisation_groups
          WHERE restaurant_id = ${submission.restaurant_id}
        `;

        const groups = groupRows as GroupRow[];
        const groupIds = groups.map((group) => group.id);

        const optionRows =
          groupIds.length > 0
            ? await sql`
                SELECT id, group_id, name
                FROM customisation_options
                WHERE group_id = ANY(${groupIds})
              `
            : [];

        const options = optionRows as OptionRow[];

        const norm = (s: string) =>
          s.trim().toLowerCase();

        const normGroup = (s: string) =>
          s
            .replace(/\s*\(.*?\)/g, "")
            .trim()
            .toLowerCase();

        const lookup: Record<
          string,
          Record<string, string>
        > = {};

        for (const group of groups) {
          const groupKey = normGroup(group.name);

          if (!lookup[groupKey]) {
            lookup[groupKey] = {};
          }

          for (const option of options.filter(
            (item) => item.group_id === group.id
          )) {
            lookup[groupKey][norm(option.name)] = option.id;
          }
        }

        let matched = 0;

        const total = Object.values(agg).reduce(
          (count, opts) =>
            count + Object.keys(opts).length,
          0
        );

        for (const [groupName, groupOptions] of Object.entries(
          agg
        )) {
          for (const [optionName, a] of Object.entries(
            groupOptions
          )) {
            const optionId =
              a.option_id ||
              lookup[normGroup(groupName)]?.[
                norm(optionName)
              ];

            if (!optionId) {
              continue;
            }

            matched++;

            await sql`
              UPDATE customisation_options
              SET
                calories_delta = ${Math.round(mean(a.cal))},
                protein_delta_g = ${
                  Math.round(mean(a.prot) * 10) / 10
                },
                carbs_delta_g = ${
                  Math.round(mean(a.carbs) * 10) / 10
                },
                fat_delta_g = ${
                  Math.round(mean(a.fat) * 10) / 10
                },
                fibre_delta_g = ${
                  Math.round(mean(a.fibre) * 10) / 10
                },
                sugar_delta_g = ${
                  Math.round(mean(a.sugar) * 10) / 10
                },
                sat_fat_delta_g = ${
                  Math.round(mean(a.sat_fat) * 10) / 10
                },
                sodium_delta_mg = ${
                  Math.round(mean(a.sodium))
                }
              WHERE id = ${optionId}
            `;
          }
        }

        extraResponse = {
          matched,
          total,
          debug_agg_keys: Object.entries(agg).flatMap(
            ([group, opts]) =>
              Object.keys(opts).map(
                (option) => `${group} / ${option}`
              )
          ),
          debug_lookup_keys: Object.entries(lookup).flatMap(
            ([group, opts]) =>
              Object.keys(opts).map(
                (option) => `${group} / ${option}`
              )
          ),
        };

        const restaurantRows = await sql`
          SELECT slug, tier
          FROM restaurants
          WHERE id = ${submission.restaurant_id}
          LIMIT 1
        `;

        const restaurant = restaurantRows[0] as
          | {
              slug: string;
              tier: number;
            }
          | undefined;

        if (restaurant) {
          if (restaurant.tier === 3) {
            await sql`
              UPDATE restaurants
              SET tier = 2
              WHERE id = ${submission.restaurant_id}
            `;
          }

          revalidatePath(
            `/restaurants/${restaurant.slug}`
          );

          if (submission.menu_item_id) {
            revalidatePath(
              `/restaurants/${restaurant.slug}/build/${submission.menu_item_id}`
            );
          }

          revalidatePath("/");
        }
      }
    }

    return NextResponse.json({
      success: true,
      ...extraResponse,
    });
  } catch (error) {
    console.error("Submission update failed:", error);

    return NextResponse.json(
      { error: "Submission update failed" },
      { status: 500 }
    );
  }
}