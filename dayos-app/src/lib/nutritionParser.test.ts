import { describe, expect, it } from 'vitest'
import { parseNutritionMarkdownTable } from './nutritionParser'

describe('parseNutritionMarkdownTable', () => {
  it('parses valid markdown rows and skips TOTAL', () => {
    const input = `| Item | Portion | Calories | Protein (g) | Fats (g) | Carbs (g) |
| --- | --- | --- | --- | --- | --- |
| Naan | 2 whole | 380 | 10 | 10 | 62 |
| TOTAL | | 380 | 10 | 10 | 62 |`

    const result = parseNutritionMarkdownTable(input)

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]).toMatchObject({
      name: 'Naan',
      portionLabel: '2 whole',
      calories: 380,
      proteinG: 10,
      fatsG: 10,
      carbsG: 62,
      source: 'import',
    })
  })

  it('falls back to calorie computation when calories are empty', () => {
    const input = `| Item | Portion | Calories | Protein (g) | Fats (g) | Carbs (g) |
| --- | --- | --- | --- | --- | --- |
| Paneer | 5 cubes |  | 8g | 7g | 2g |`

    const result = parseNutritionMarkdownTable(input)
    expect(result.rows[0]?.calories).toBe(103)
    expect(result.warnings.length).toBe(1)
  })

  it('cleans comma values and warns for malformed rows', () => {
    const input = `| Item | Portion | Calories | Protein (g) | Fats (g) | Carbs (g) |
| --- | --- | --- | --- | --- | --- |
| Meal A | test | 1,410 | 51g | 61g | 172g |
| Meal B | test | 0 | 20 |  |  |
|  | empty | 100 | 5 | 2 | 8 |`

    const result = parseNutritionMarkdownTable(input)
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0]?.calories).toBe(1410)
    expect(result.warnings.some((warning) => warning.includes('Meal B'))).toBe(true)
  })

  it('returns warning for unexpected headers', () => {
    const input = `| Food | Qty | Calories | Protein | Fat | Carbs |
| --- | --- | --- | --- | --- | --- |
| A | 1 | 100 | 5 | 2 | 8 |`

    const result = parseNutritionMarkdownTable(input)
    expect(result.rows).toHaveLength(0)
    expect(result.warnings[0]).toContain('Header mismatch')
  })
})

