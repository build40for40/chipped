// Pub facts for the chip deck. The price and ER facts are worked out from ./data.json;
// the rest are findings written up in data/README.md, each with its source.
import { change, data, last } from './draw'

export interface Fact {
  text: string
  source: string
}

const item = (k: string) => data.prices.items.find((i) => i.key === k)!
const chips = item('potato-chips')
const [c0, v0] = chips.points[0]!
const [c1, v1] = last(chips.points)
const chipsThen = chips.nominal![c0]!
const chipsNow = chips.nominal![c1]!
const chipsThenToday = (chipsNow / v1) * v0

export const FACTS: Fact[] = [
  {
    text: `Painting your own nails costs what it did in ${item('polish').points[0]![0]}. A salon visit costs ${Math.round(change(item('salon')))}% more, after inflation.`,
    source: 'BLS consumer price indexes via FRED',
  },
  {
    text: `More Americans go to the ER over manicures and nail products (about ${Math.round(data.er.manicure / 1000)},000 a year) than over nail guns (about ${Math.round(data.er.nailGun / 1000)},000).`,
    source: `CPSC NEISS, ${data.er.from}–${data.er.to}`,
  },
  {
    text: `A bag of potato chips cost $${chipsThen.toFixed(2)} in ${c0}. That's $${chipsThenToday.toFixed(2)} in today's money, more than the $${chipsNow.toFixed(2)} it costs now.`,
    source: 'BLS average prices via FRED',
  },
  {
    text: `Microchips cost ${Math.round(-change(item('microchips')))}% less than in ${item('microchips').points[0]![0]}, after inflation.`,
    source: 'BLS producer prices via FRED',
  },
  { text: 'A nail cost ten times more in 1790 than in 1930, after inflation.', source: 'Sichel, NBER Working Paper 29617' },
  { text: "When gyms hire, nail salons hire. Hair salons don't follow.", source: 'BLS jobs data, 2005–2025' },
  { text: 'In the 2020 lockdowns, Wikipedia views of sourdough rose 78%. Nail polish: 0.3%. Everyone baked, nobody painted.', source: 'Wikipedia pageviews, 21 languages' },
  { text: 'Officially, Romanians spend about €18 a year each at hair and beauty salons, the third lowest in Europe. The nail love happens off the books.', source: 'Eurostat business statistics, 2023' },
  { text: '"Chip on your shoulder" tracks "chipped nails" in books, even year on year.', source: 'Google Books Ngram' },
  {
    text: "Jensen Huang's Wikipedia page jumped from about 6,000 views a day to 1.07 million when he resigned amid reports of an affair with an alleged Chinese spy.",
    source: 'Wikipedia pageviews, 12 November 2026',
  },
]
