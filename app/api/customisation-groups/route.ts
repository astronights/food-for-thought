import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const menuItemId = req.nextUrl.searchParams.get("menuItemId");
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");

  if (!menuItemId || !restaurantId) {
    return NextResponse.json(
      { error: "Missing menuItemId or restaurantId" },
      { status: 400 }
    );
  }

  try {
    const groups = await sql`
      SELECT *
      FROM customisation_groups
      WHERE menu_item_id = ${menuItemId}
         OR (
           restaurant_id = ${restaurantId}
           AND menu_item_id IS NULL
         )
      ORDER BY display_order ASC
    `;

    if (groups.length === 0) {
      return NextResponse.json([]);
    }

    const groupIds = groups.map(
      (group) => group.id as string
    );

    const options = await sql.query(
    `
        SELECT *
        FROM customisation_options
        WHERE group_id = ANY($1::uuid[])
        ORDER BY display_order ASC
    `,
    [groupIds]
    );

    const result = groups.map((group) => ({
      ...group,
      options: options.filter(
        (option) => option.group_id === group.id
      ),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "Failed to load customisation groups:",
      error
    );

    return NextResponse.json(
      { error: "Failed to load customisation groups" },
      { status: 500 }
    );
  }
}