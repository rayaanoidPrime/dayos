export type ParsedMealRow = {
  name: string
  portionLabel: string
  calories: number
  proteinG: number
  fatsG: number
  carbsG: number
  source: 'import'
  selected: boolean
}

export type NutritionParseResult = {
  rows: ParsedMealRow[]
  warnings: string[]
}

const canonical = ['item', 'portion', 'calories', 'protein (g)', 'fats (g)', 'carbs (g)'] as const

const normalizeHeader = (value: string) => value.trim().toLowerCase()

function isSeparatorRow(row: string): boolean {
  const clean = row.replace(/\|/g, '').replace(/\s/g, '')
  return clean.length > 0 && /^-+$/.test(clean)
}

function cleanNumeric(raw: string): number {
  if (!raw.trim()) {
    return 0
  }

  const stripped = raw
    .replace(/,/g, '')
    .replace(/~/g, '')
    .replace(/[a-zA-Z]+$/g, '')
    .trim()

  const match = stripped.match(/-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : 0
}

export function parseNutritionMarkdownTable(input: string): NutritionParseResult {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length < 2) {
    return { rows: [], warnings: ['No markdown table rows detected.'] }
  }

  const headerCells = lines[0].split('|').map((cell) => normalizeHeader(cell))
  const header = headerCells.filter((cell) => cell.length > 0)

  const headerMatches = canonical.every((col, index) => header[index] === col)
  if (!headerMatches) {
    return {
      rows: [],
      warnings: ['Header mismatch. Expected Item | Portion | Calories | Protein (g) | Fats (g) | Carbs (g).'],
    }
  }

  const bodyLines = lines.slice(1)
  const warnings: string[] = []
  const rows: ParsedMealRow[] = []

  for (const line of bodyLines) {
    if (isSeparatorRow(line)) {
      continue
    }

    const rawCells = line.split('|').map((cell) => cell.trim())
    const cells = rawCells.filter((_cell, index) => index > 0 && index < rawCells.length - 1 ? true : true)
    const normalizedCells = cells.length >= 6 ? cells : line.split('|').map((cell) => cell.trim())
    const compact = normalizedCells.filter((cell, index) => {
      if (index === 0 || index === normalizedCells.length - 1) {
        return cell.length > 0
      }
      return true
    })

    const [nameRaw = '', portion = '', caloriesRaw = '', proteinRaw = '', fatsRaw = '', carbsRaw = ''] =
      compact.length >= 6 ? compact : normalizedCells

    const name = nameRaw.trim()
    if (!name) {
      continue
    }

    if (name.toLowerCase() === 'total') {
      continue
    }

    const calories = cleanNumeric(caloriesRaw)
    const proteinG = cleanNumeric(proteinRaw)
    const fatsG = cleanNumeric(fatsRaw)
    const carbsG = cleanNumeric(carbsRaw)

    const filledNumericColumns = [caloriesRaw, proteinRaw, fatsRaw, carbsRaw].filter((value) => cleanNumeric(value) > 0).length
    if (filledNumericColumns < 4) {
      warnings.push(`Row "${name}" has fewer than 4 filled numeric columns.`)
    }

    const computedCalories = proteinG * 4 + carbsG * 4 + fatsG * 9

    rows.push({
      name,
      portionLabel: portion,
      calories: calories > 0 ? calories : computedCalories,
      proteinG,
      fatsG,
      carbsG,
      source: 'import',
      selected: true,
    })
  }

  return { rows, warnings }
}

