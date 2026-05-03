import dotenv from "dotenv"
import fs from "node:fs"
import { Client } from "pg"

dotenv.config({ path: ".env" })

const ENV_FILE = ".env"

function readProductionDatabaseUrl() {
  const envContent = fs.readFileSync(ENV_FILE, "utf8")
  const match = envContent.match(/^#\s*DATABASE_URL=(?:"([^"]+)"|([^\n#]+))$/m)

  if (!match) {
    throw new Error(`No commented production DATABASE_URL found in ${ENV_FILE}`)
  }

  return (match[1] || match[2] || "").trim().replace(/^"/, "").replace(/"$/, "")
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

type CategoryRule = {
  categorySlug: string
  test: (value: string) => boolean
}

const rules: CategoryRule[] = [
  {
    categorySlug: "sin-gluten",
    test: (value) =>
      /sin tacc|sin tacco|chocoarroz|salmas hornedas|barra de arroz|tostadas de arroz|snack de arroz|alfajor jorgito/i.test(
        value,
      ),
  },
  {
    categorySlug: "hamburguesas",
    test: (value) => /hamburguesa|hambur|brioche de 4|sesamo 5|sesamo x 60|tipo artesano brioche/i.test(value),
  },
  {
    categorySlug: "panchos",
    test: (value) => /pancho|panchos|pan panch|especial con sesamo|max x 60/i.test(value),
  },
  {
    categorySlug: "artesano",
    test: (value) => /artesano/i.test(value),
  },
  {
    categorySlug: "blanco",
    test: (value) => /blanco|hogaza blanca/i.test(value),
  },
  {
    categorySlug: "integrales",
    test: (value) =>
      /integral|multigrano|cereales y semillas|salvado|con semillas|semillas/i.test(value),
  },
  {
    categorySlug: "alfajores",
    test: (value) => /alfajor/i.test(value),
  },
  {
    categorySlug: "barquillos",
    test: (value) => /barquillos?/i.test(value),
  },
  {
    categorySlug: "barras",
    test: (value) => /barrita|barra de cereal|barritas cereal/i.test(value),
  },
  {
    categorySlug: "bizcochos",
    test: (value) => /bizcochos? dulces/i.test(value),
  },
  {
    categorySlug: "bizcochos",
    test: (value) => /bizcochos? salados?/i.test(value),
  },
  {
    categorySlug: "brownies",
    test: (value) => /brownie|braunichoc/i.test(value),
  },
  {
    categorySlug: "budines",
    test: (value) => /budin/i.test(value),
  },
  {
    categorySlug: "cereales",
    test: (value) => /cereal de maiz inflado|cereal/i.test(value),
  },
  {
    categorySlug: "galletitas",
    test: (value) => /frutigran|bay biscuit/i.test(value),
  },
  {
    categorySlug: "galletitas",
    test: (value) =>
      /galletitas? granix|galletas? marineras|galletas? de arroz|sandwich/i.test(value),
  },
  {
    categorySlug: "madalenas",
    test: (value) => /madalena/i.test(value),
  },
  {
    categorySlug: "obleas",
    test: (value) => /oblea/i.test(value),
  },
  {
    categorySlug: "pan-dulce",
    test: (value) => /pan dulce/i.test(value),
  },
  {
    categorySlug: "piononos",
    test: (value) => /pionono/i.test(value),
  },
  {
    categorySlug: "turrones",
    test: (value) => /turron/i.test(value),
  },
  {
    categorySlug: "vainillas",
    test: (value) => /vainilla/i.test(value),
  },
  {
    categorySlug: "grisines",
    test: (value) => /grisines?|talitas/i.test(value),
  },
  {
    categorySlug: "pastas",
    test: (value) => /conchiglie|fusilli|penne/i.test(value),
  },
  {
    categorySlug: "rapiditas",
    test: (value) => /rapiditas?|tortilla/i.test(value),
  },
  {
    categorySlug: "snacks",
    test: (value) =>
      /takis|mani japones|semillas de girasol|snacks? sabor pizza|tostadas de pan|tostaditas/i.test(value),
  },
]

async function main() {
  const productionDbUrl = readProductionDatabaseUrl()
  const db = new Client({ connectionString: productionDbUrl })

  const dryRun = process.argv.includes("--dry-run")

  await db.connect()

  try {
    const categoriesResult = await db.query(
      `select id, slug from categories where slug = any($1::text[])`,
      [
        [
          "sin-gluten",
          "alfajores",
          "barquillos",
          "barras",
          "bizcochos",
          "brownies",
          "budines",
          "cereales",
          "galletitas",
          "madalenas",
          "obleas",
          "pan-dulce",
          "piononos",
          "turrones",
          "vainillas",
          "hamburguesas",
          "panchos",
          "artesano",
          "blanco",
          "integrales",
          "grisines",
          "pastas",
          "rapiditas",
          "snacks",
        ],
      ],
    )

    const categoryBySlug = new Map<string, string>(
      categoriesResult.rows.map((row) => [row.slug as string, row.id as string]),
    )

    const productsResult = await db.query(
      `select id, name, slug, "categoryId" from products where "categoryId" is null order by name`,
    )

    const products = productsResult.rows as Array<{
      id: string
      name: string
      slug: string
      categoryId: string | null
    }>

    const assignments = new Map<string, number>()
    const unmatched: string[] = []

    for (const product of products) {
      const normalized = normalize(`${product.name} ${product.slug}`)
      const rule = rules.find((entry) => entry.test(normalized))

      if (!rule) {
        unmatched.push(product.name)
        continue
      }

      const categoryId = categoryBySlug.get(rule.categorySlug)

      if (!categoryId) {
        throw new Error(`Category slug not found in DB: ${rule.categorySlug}`)
      }

      assignments.set(rule.categorySlug, (assignments.get(rule.categorySlug) || 0) + 1)

      if (!dryRun) {
        await db.query(`update products set "categoryId" = $1 where id = $2`, [
          categoryId,
          product.id,
        ])
      }
    }

    console.log(`Products without category scanned: ${products.length}`)
    console.log(`Matched products: ${products.length - unmatched.length}`)
    console.log(`Unmatched products: ${unmatched.length}`)

    if (unmatched.length > 0) {
      console.log("Unmatched names:")
      for (const name of unmatched) {
        console.log(`- ${name}`)
      }
    }

    console.log("Assignments by category:")
    for (const [slug, count] of [...assignments.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`- ${slug}: ${count}`)
    }

    if (dryRun) {
      console.log("Dry run only, nothing was written.")
      return
    }

    console.log("Category association applied.")
  } finally {
    await db.end()
  }
}

main().catch((error) => {
  console.error("❌ Category association failed:", error)
  process.exit(1)
})
