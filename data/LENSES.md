# The seven lenses: what data we have and what is missing

Written 13 November 2026. Every number in `data/parts/` came from a response one of the scripts in `data/scripts/` fetched. Nothing is estimated or filled in. The one hand-built file is `eating-styles.json`, and it says so.

Three things are true across every lens, so read them first.

- **There is no free nail polish sales series anywhere.** Polish is measured here by imports (trade, not tills). Shop prices now exist, see "The manicure index" below. Sales never.
- **Every UK and European salon series mixes hair and beauty.** The official industry code (SIC and NACE 96.02) is "hairdressing and other beauty treatment". Nail bars cannot be split out. Only the US counts nail salons on their own, and only as jobs.
- **"Direct" below means the series measures the thing the lens asks about.** "Stand-in" means it measures something nearby and the chart must say so.

All files are served at `https://build40for40.com/chipped/data/<file>` once published.

## Lens 1. Pride: nail salons vs births, women managers and dating

Country: UK first. US where the UK has nothing.

| File | What it is | Country | Years | Grain | Source | Licence | Direct or stand-in |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `uk-selfcare-business.json` (`sic9602_turnover_million_gbp`) | Turnover of hair and beauty businesses | UK | 2008 to 2024 | Yearly | ONS Annual Business Survey | OGL v3 | Stand-in for nail salon sales (hair is mixed in) |
| `bls-salons.json` (`CEU8081211301`) | Jobs in nail salons | US | 1990 to 2026 | Monthly | BLS | Public domain | Direct for nail salons, but jobs not sales |
| `births-marriage-management.json` (`births_*`, `birth_rate_*`, `fertility_rate_*`) | Live births, births per 1,000 people, children per woman | UK, US | 1950 to 2023 | Yearly | UN via Our World in Data | CC BY 4.0 | Direct |
| `births-marriage-management.json` (`women_management_share_*`) | Share of senior and middle management jobs held by women | UK 2000 to 2024, US 2003 to 2025 | | Yearly | ILO via Our World in Data | CC BY 4.0 | Stand-in for promotions |
| `uk-nomis.json` (`women_share_group1_soc2010_pct`, `women_share_group1_soc2020_pct`, `women_group1_*`) | Women as a share of managers, directors and senior officials, and their number | UK | 2006 to 2025 | Yearly | ONS Annual Population Survey via Nomis | OGL v3 | Stand-in for promotions. Best UK series for this lens |
| `uk-women-work.json` (`women_share_OC1_pct`, `women_OC1_thousands`) | Women as a share of all managers, and their number | UK | 1992 to 2019 | Yearly | Eurostat Labour Force Survey | CC BY 4.0 | Stand-in for promotions |
| `births-marriage-management.json` (`marriage_rate_*`) | Marriages per 1,000 people | UK 1960 to 2020, US 1950 to 2022 | | Yearly | OECD and national offices via Our World in Data | CC BY 4.0 | Stand-in for dating |
| `lens-pageviews.json` (`series` in group `dating`) | English Wikipedia views of Tinder, Bumble, Hinge and Online dating | English speakers worldwide | Jul 2015 to Oct 2026 | Monthly | Wikimedia | CC0 | Weak stand-in for dating-app use |

Gaps:

- No series of women's promotions exists in open data. We count women in manager jobs instead. That moves slowly and will not show a year-on-year link.
- The ILO management share for the UK has breaks in 2005 and 2011 where the job classification changed (it jumps from 32% to 43% and back). Use the Nomis series instead: 32.9% in 2006 to 37.8% in 2025, with one small break in 2021 where the job groups were redrawn.
- No pregnancy or conception rate. ONS publishes conceptions for England and Wales as spreadsheets and we did not fetch them. Births lag conceptions by nine months, so a yearly chart blurs this anyway.
- No dating data at all. Marriages are a poor proxy and include every kind of couple. Wikipedia views of dating apps are worldwide and only start in 2015.
- UK marriage data stops in 2020, which is the lockdown year (1.4 per 1,000).
- UK salon turnover is hair plus beauty and is not adjusted for inflation.

## Lens 2. Manual work and sport: nail polish vs women in manual jobs and women playing sport

Country: UK.

| File | What it is | Country | Years | Grain | Source | Licence | Direct or stand-in |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `uk-nail-trade.json` (`imports_gbp`, `imports_kg`) | Imports of manicure and pedicure preparations (commodity 33043000) | UK | Jan 2000 to Sep 2026 | Monthly and yearly | HMRC | OGL v3 | Stand-in for polish sales |
| `uk-nomis.json` (`women_manual_soc2010`, `women_manual_soc2020`, `women_group5/8/9_*`) | Women employed in skilled trades, machine operative and elementary jobs | UK | 2006 to 2025 | Yearly | ONS Annual Population Survey via Nomis | OGL v3 | Direct |
| `uk-women-work.json` (`women_manual_thousands`, `women_manual_share_pct`, `women_OC6..OC9_thousands`) | Women employed in manual occupations (farm, craft and trades, machine operators, elementary jobs) | UK | 1992 to 2019 | Yearly | Eurostat Labour Force Survey | CC BY 4.0 | Direct |
| `england-women-sport.json` (`women_active_pct`, `women_active_people`, and the same for men) | Share and number of women who do 150 minutes or more of sport or physical activity a week | England | 2016 to 2025 (survey years ending each November) | Yearly | Sport England Active Lives Adult Survey | Credit Sport England | Close stand-in for women playing sport |
| `uk-grooming-prices.json` (`D7EY`) | Price index for hairdressing and personal grooming | UK | 1988 to Sep 2026 | Monthly and yearly | ONS | OGL v3 | Background only (prices, not volume) |

Gaps:

- The sport series is "being active", which counts walking, dance, fitness classes and gardening as well as sport. It covers England only and has just ten points (59.9% of women in 2016, 62.2% in 2025). Ten points is thin for a correlation.
- All three lines only overlap for 2016 to 2025.
- No nail polish sales series, so the polish line is imports. Imports also cover removers, gels and cuticle products, and the way EU trade was counted changed in 2021.
- The two manual work series use different job groupings, so their levels differ (about 2.0 million women on the UK grouping, 1.6 million on the international one). Pick one. The Nomis one runs 2006 to 2025 with a break in 2021. The Eurostat one runs 1992 to 2019 with a break in 2011.
- "Manual" is our grouping of whole job families. It includes cleaners and kitchen staff, and leaves out nurses and carers, who also work with their hands.

## Lens 3. By industry: share of women wearing nail polish by UK industry

| File | What it is | Country | Years | Grain | Source | Licence | Direct or stand-in |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `uk-nomis.json` (`industries`) | Jobs held by women, and women's share of jobs, in each of 21 industry sections (SIC 2007 sections A to U) | UK | June 1996 to June 2026 | Yearly (each June) | ONS workforce jobs via Nomis | OGL v3 | Not a measure of polish. It is the weighting base for a poll |
| `uk-women-work.json` (`industries`) | Women employed (people, not jobs) in the same sections, ages 15 to 64 | UK | 2008 to 2019 | Yearly | Eurostat Labour Force Survey | CC BY 4.0 | Same, as a cross-check |

Gaps:

- **No dataset of nail polish wearing by industry exists.** We found none and do not expect one. This lens can only be answered by running a poll.
- What we have is how many jobs women hold in each industry (in June 2026, 3.84 million in health and social work, 76% of the jobs there, and 0.41 million in construction, 18%), so poll answers can be weighted properly.
- The Nomis figures count jobs, so a woman with two jobs counts twice. The Eurostat figures count people but stop in 2019.

## Lens 4. Covid hobbies: how hard Covid hit vs interest in home and outdoor hobbies

| File | What it is | Country | Years | Grain | Source | Licence | Direct or stand-in |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `covid-by-country.json` | Confirmed cases per 100,000 by year end, mean and peak lockdown stringency (0 to 100) | 236 countries and territories, 181 with a stringency score | 2020 and 2021 | One row per country | Our World in Data (WHO, Oxford tracker) | CC BY 4.0 | Direct |
| `lens-pageviews.json` (`byLanguage`) | Wikipedia views in 2019 and 2020 of 9 home hobbies (nail polish, manicure, knitting, crochet, baking, sourdough, jigsaw puzzle, yoga, gardening) and 7 outdoor ones (hiking, camping, cycling, running, jogging, angling, surfing) | 25 language editions, each mapped to one country | 2019 and 2020 | One row per language | Wikimedia, Wikidata | CC0 | Stand-in for interest |
| `nail-imports-by-country.json` | Imports of manicure and pedicure preparations, in dollars and per woman | About 180 countries | 2018 to 2023 | Yearly | UN Comtrade, Our World in Data | Free with credit, CC BY 4.0 | Stand-in for polish bought, to compare 2019 with 2020 |

Gaps:

- No Google Trends (it has no free API). Wikipedia views are the stand-in, and reading a page about knitting is not knitting.
- A language is not a country. We only kept languages that mostly belong to one country, so **the UK, US, India, Brazil, Spain, Mexico, Nigeria, Australia and every other English, Spanish, Portuguese or Arabic speaking country are missing** from the hobby side. German and French rows are marked `shared` because Austria, Switzerland, Belgium and others read them too.
- Some hobbies have no article in some languages, so rows have holes (Slovak has only 5 of the 16).
- Leave Turkey out. Wikipedia was blocked there until January 2020, so its 2019 views are near zero and 2020 looks like a fivefold rise. The row carries a `caveat` saying so.
- Confirmed cases depend on how much a country tested. Stringency is the better "how hard did it hit daily life" measure.
- The hobby list is ours. Adding or dropping a hobby changes the home and outdoor totals.

## Lens 5. Hands or cutlery: nail polish per woman vs how people eat

| File | What it is | Country | Years | Grain | Source | Licence | Direct or stand-in |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `nail-imports-by-country.json` (`imports_usd_per_woman`) | Imports of manicure and pedicure preparations divided by the female population | About 180 countries | 2018 to 2023 | Yearly | UN Comtrade, Our World in Data | Free with credit, CC BY 4.0 | Stand-in for polish bought per woman |
| `eating-styles.json` | Whether people mostly eat with hands, chopsticks or cutlery, with the Wikipedia article each row rests on | 14 countries | Undated | One row per country | Hand-coded from Wikipedia | CC BY-SA 4.0 for the articles | Hand-coded, not a dataset |

Gaps:

- **Imports are not purchases.** Countries that make their own polish (France, the US, China, India) look low. Countries that ship goods onward (the Netherlands at about $7.58 per woman in 2023, Hong Kong, Singapore) look high. This alone could create or hide the pattern the lens is looking for.
- Only 14 countries have an eating style, 4 hands, 4 chopsticks and 6 cutlery. That is too few to prove anything. A row was only added where an article says plainly how most people eat.
- "Per woman" divides by women and girls of all ages.
- Income drives both things. Rich countries buy more of everything, and most of the cutlery group is rich. Any chart needs to say so.

## Lens 6. Self care: nail salons vs yoga, Pilates, gym, massage, spa

Country: UK for money, US for jobs.

| File | What it is | Country | Years | Grain | Source | Licence | Direct or stand-in |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `uk-selfcare-business.json` | Turnover, businesses, value added and wage bill for hair and beauty (96.02), physical well-being such as spas and massage (96.04) and fitness facilities (93.13) | UK | 2008 to 2024 | Yearly | ONS Annual Business Survey | OGL v3 | Direct for spa, massage and gym. Stand-in for nails |
| `uk-nomis.json` (`series`) | Number of businesses in the same three industries, each March | UK | 2010 to 2026 | Yearly | ONS UK Business Counts via Nomis | OGL v3 | Same as above, and it runs two years later |
| `eu-selfcare-business.json` | Businesses, people employed and turnover for the same three industries | 33 European countries plus the EU total, no UK | 2021 to 2024 | Yearly | Eurostat | CC BY 4.0 | Same as above |
| `bls-salons.json` | Jobs in nail salons and hair salons | US | 1990 to 2026 | Monthly | BLS | Public domain | Direct, jobs |
| `lens-pageviews.json` (`series` in group `selfcare`) | English Wikipedia views of Yoga, Pilates, Health club, Massage, Spa, Nail salon, Manicure, Pedicure | English speakers worldwide | Jul 2015 to Oct 2026 | Monthly | Wikimedia | CC0 | Stand-in for interest |
| `uk-grooming-prices.json` | Price index for hairdressing and grooming | UK | 1988 to 2026 | Monthly | ONS | OGL v3 | Background |

Gaps:

- Yoga and Pilates have no series of their own. Studios are counted inside fitness facilities, or under sports education. Wikipedia views are the only way to tell yoga from Pilates from the gym.
- Nails are inside hair and beauty in every UK and European file.
- Wikipedia views of nearly every article have fallen since 2016 (Yoga went from 1.89 million views in 2016 to 0.67 million in 2025). Compare each topic's share of the group, not its raw level. The same warning applies to the dating pages in lens 1.
- US jobs in fitness centres and other personal care (massage, spas) are **not fetched yet**. `fetch-bls-selfcare.mjs` is written and was tested against the API, but the keyless BLS allowance for today ran out before it finished. Run it another day and it will write `bls-selfcare.json`.
- UK turnover is not adjusted for inflation. The count of businesses jumps where coverage changed (2016 in the survey, 2015 in the business counts), so do not read that as a boom.

## Lens 7. Protests: women at protests, then nail salons a few weeks later

Country: US, because that is where both the protest data and the nail salon series are.

| File | What it is | Country | Years | Grain | Source | Licence | Direct or stand-in |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `us-protests.json` (`events_women`, `people_women`) | Protest events tagged women's rights or reproductive rights, and the estimated crowd at them | US | Jan 2017 to May 2026 | Weekly, monthly, yearly | Crowd Counting Consortium | CC0 | Stand-in for women at protests |
| `us-protests.json` (`events_all`, `people_all`) | All protest events and crowds | US | Jan 2017 to May 2026 | Weekly, monthly, yearly | Crowd Counting Consortium | CC0 | Direct for protests |
| `bls-salons.json` (`CEU8081211301`) | Jobs in nail salons | US | 1990 to Sep 2026 | Monthly | BLS | Public domain | Stand-in for salon sales |
| `uk-nail-trade.json` | Polish imports | UK | 2000 to 2026 | Monthly | HMRC | OGL v3 | Stand-in, wrong country |

Gaps:

- **Nobody counts how many protesters were women.** We use protests about women's issues instead. The biggest month is January 2017 (the Women's March, about 4.3 million people).
- **There is no weekly nail salon or polish series.** The finest we have is monthly, and it is jobs, which react slowly and not to one weekend. "A few weeks later" cannot be tested, only "the next month or two".
- Crowd sizes are missing for many events, so the people counts are too low.
- The only monthly polish series is UK imports, and the protest data is American.
- Protest data ends in May 2026.

## The manicure index

The only official UK numbers that are only about nails. Country: UK. Files: `uk-manicure-prices.json` and `uk-manicure-affordability.json`.

| File | What it is | Years | Grain | Source | Licence | Direct or stand-in |
| --- | --- | --- | --- | --- | --- | --- |
| `uk-manicure-prices.json` (`manicure_median_gbp`, `manicure_mean_gbp`, `manicure_quotes`) | The price of a basic manicure as ONS price collectors found it in salons (item 520331) | Jan 2010 to Sep 2026 | Monthly and yearly | ONS CPI price quotes | OGL v3 | Direct |
| `uk-manicure-prices.json` (`nail_varnish_median_gbp`, `nail_varnish_mean_gbp`, `nail_varnish_quotes`) | The price of a bottle of nail varnish, 6 to 14 ml, in shops (item 520250) | Feb 2016 to Sep 2026 | Monthly and yearly | ONS CPI price quotes | OGL v3 | Direct |
| `uk-manicure-prices.json` (`manicure_by_region`) | Median manicure price in each of 12 regions | 2026 (Jan to Sep) | One row per region | ONS CPI price quotes | OGL v3 | Direct, but thin (35 to 163 quotes a region) |
| `uk-manicure-affordability.json` (`women_median_hourly_pay_gbp`, `all_median_hourly_pay_gbp`) | Median gross hourly pay of women employees, and of all employees, full-time and part-time together, each April | 1997 to 2025 | Yearly | ONS Annual Survey of Hours and Earnings via Nomis | OGL v3 | Direct |
| `uk-manicure-affordability.json` (`KAB9`) | Mean weekly pay, everyone, Great Britain, seasonally adjusted | Jan 2000 to Aug 2026 | Monthly and yearly | ONS average weekly earnings | OGL v3 | Direct |
| `uk-manicure-affordability.json` (`D7BT`) | Consumer prices index, all items, 2015 = 100 | Jan 1988 to Sep 2026 | Monthly and yearly | ONS | OGL v3 | Direct. An index, not a price |
| `uk-manicure-affordability.json` (`manicure_minutes_of_work`, `nail_varnish_minutes_of_work`) | Minutes a woman on median hourly pay works to pay for one. Year's median price divided by hourly pay, times 60 | Manicure 2010 to 2025, varnish 2016 to 2025 | Yearly | Derived | OGL v3 | Derived |
| `uk-manicure-affordability.json` (`manicure_real_gbp`, `nail_varnish_real_gbp`) | The median price in September 2026 money. Price times the all-items index for September 2026, divided by the index for the same month | Same months and years as the prices | Monthly and yearly | Derived | OGL v3 | Derived |
| `uk-manicure-affordability.json` (`manicure_pct_of_weekly_pay`, `nail_varnish_pct_of_weekly_pay`) | The median price as a percentage of mean weekly pay | To Aug 2026 | Monthly | Derived | OGL v3 | Derived |

What it says:

- A basic manicure cost a median £18 in 2010 and £25 in 2026 (January to September). In September 2026 it was £25, from 121 quotes.
- In September 2026 money that is £29.00 in 2010 and £25.37 in 2026. Manicures rose more slowly than prices in general.
- A woman on median hourly pay worked 109 minutes for a manicure in 2010 and 90 minutes in 2025.
- A bottle of nail varnish cost a median £3.99 in 2016 and £4.49 in 2026. In September 2026 money that is £5.71 and £4.56. It took 22 minutes of work in 2016 and 14 in 2025.
- In 2026 the dearest region was Northern Ireland (median £33, only 35 quotes) and the cheapest were the North, the North West and the East Midlands (£20). London was £25.

The rule for a valid quote: the ONS used it in that month's index, and the price is above zero. In files up to January 2025 that means validity code 3 or 4. From February 2025 it means `VALIDITY` is true. Quotes marked missing, out of stock or not validated are dropped. About 5% of manicure rows were dropped.

Months covered:

- Manicure: 184 months from January 2010 to September 2026. A month rests on about 125 quotes up to 2020 and about 110 to 120 since.
- Nail varnish: 119 months from February 2016, when the ONS added it to the basket, to September 2026. A month rests on about 200 quotes.
- The ONS page has no file for January and February 2017 or for January to July 2019. Those months are missing for both items, so 2017 is ten months and 2019 is five.
- Manicures have no valid quotes for April, May, June and November 2020 or January to April 2021, because salons were shut. July 2020 has 63 and May 2021 has 74.
- A yearly figure pools every valid quote of that year. `coverage.months_in_year` in the file says how many months that was. 2026 is nine months.

Caveats:

- The sample of salons and shops changes every February, and salons come and go in between. A move of a pound can be the sample, not the price.
- "Basic manicure" is the collector's pick of the plainest manicure a salon sells. We cannot tell whether it includes polish. It should not include gel or acrylics, but the file does not say what was priced.
- Medians sit on round numbers (£18, £20, £25), so the median moves in steps. The mean is smoother (£18.09 in 2010, £25.75 in 2026).
- Quotes are not weighted. The ONS weights them by region and shop type when it builds its index, so these are not official average prices.
- A chain that is priced centrally shows up once per region at the same price. For nail varnish this means a few chains set the median, and the mean (£8.74 in 2026) is far above the median (£4.49) because some bottles cost over £20.
- Pay is before tax and is measured each April. The 2026 pay figure was not on Nomis yet, so minutes of work stop at 2025.
- Weekly pay covers Great Britain, not Northern Ireland, and is a mean, so it is pulled up by high earners.
- Prices start in 2010 because that is the first year of price quote files. The ONS item index for manicures goes back to 2005 but it is an index, not a price, and we did not use it.

### Other countries

File: `grooming-affordability-by-country.json`. Script: `fetch-grooming-affordability.mjs`. 34 countries, each compared only with itself.

| File | What it is | Countries | Years | Source | Direct or stand-in |
| --- | --- | --- | --- | --- | --- |
| `grooming-affordability-by-country.json` (`countries[].price_index`) | Price index for hairdressing and personal grooming | 28 in Europe (Eurostat), plus UK (ONS), US (BLS via FRED), Canada (Statistics Canada), Australia (ABS) | Mostly 1996 to 2025 | National consumer price indexes | Stand-in for manicures. Mostly haircuts |
| `grooming-affordability-by-country.json` (`countries[].price_index`, Brazil) | Price index for the item "Manicure" | Brazil | 2012 to 2025 | IBGE IPCA | Direct for nails, but an index and not a price |
| `grooming-affordability-by-country.json` (`countries[].wage`) | Mean yearly wage of a full-time equivalent employee, both sexes, in the country's own money | All but Brazil | 1990 to 2025 | OECD average annual wages | Direct |
| `grooming-affordability-by-country.json` (`countries[].price_to_pay_index`) | The price index divided by the pay index, both set to 2015 = 100 | All 34 | As above | Derived | Derived |

Which tier each country is in:

- **Tier A, a real manicure price in money: the UK only.** No other statistics office we checked publishes one. So there are no minutes of work for any other country.
- **Tier B, an index only: 34 countries.** 33 use the hairdressing and grooming index. Brazil is the odd one out. Its statistics office tracks manicures as their own item, so its index is about nails alone (`nail_specific: true`). It is still an index, not a price.

What the index means: `price_to_pay_index` is 100 in 2015, and a figure above 100 means a trip to the salon takes more work to pay for than it did in 2015, and below 100 means less.

What it says (2024, the latest year with all 34 countries):

- Easiest to afford compared with 2015: Romania 56.6, Türkiye 58.4, Hungary 76.9. Pay there rose much faster than salon prices.
- Hardest to afford compared with 2015: Sweden 113.0, Slovakia 111.7, the Netherlands 108.5.
- UK 102.4, US 98.5, Brazil (manicures alone) 94.8.
- The UK shows how much the pay measure matters. Against the OECD mean wage the UK index is 102.6 in 2025. Against women's median hourly pay it is 90.5. The real manicure figure, minutes of work, is 87.2 on the same 2015 = 100 scale. All three are in the UK entry.
- The US also carries women's median weekly pay (full-time only): 96.8 in 2024.

Caveats:

- The grooming index is mostly haircuts. It also covers barbers, beauty treatments and nails, in shares we cannot see. It is a stand-in for manicures everywhere except Brazil.
- An index cannot say what anything costs. It cannot say which country is dearer. It only says how one country has moved against its own past.
- Pay is a mean for both sexes, so high earners pull it up. The UK manicure index uses the median for women. The two can point different ways, as the UK shows.
- Pay measures differ by country. The OECD wage is from national accounts and counts full-time equivalents. Brazil uses a household survey of monthly earnings. The UK and US women's figures are medians from pay surveys, hourly for the UK and weekly for full-time workers in the US.
- Türkiye's figures are swamped by inflation. Its salon index rose about elevenfold from 2015 to 2024 and wages about nineteenfold.
- Some years are worked out here, not published: the US and Brazil yearly index is the mean of 12 months, Australia's is the mean of 4 quarters. A year with a missing month is left out, which is why the US has no 2025 (the October 2025 figure was never published).
- Brazil's index is chained here from the monthly percentage changes that IBGE publishes, starting from December 2011 = 100.
- Wages stop at 2024 for Bulgaria, Croatia, Iceland, Romania and Türkiye.
- Cyprus, Malta, Albania, Kosovo, Montenegro, North Macedonia and Serbia have the grooming index but are not in the OECD wage table, so they are left out.
- Nothing is converted between currencies.

## Things we tried that did not work

| Source | What happened |
| --- | --- |
| Nomis | Timed out for the first two hours, then worked, so `uk-nomis.json` exists. Worth knowing if a rerun hangs |
| World Bank API | HTTPS requests hung. We used Our World in Data's copies of the same World Bank and UN series |
| BLS public API | Daily keyless limit reached part way through. Script is ready, data is not |
| FRED | Does not carry the detailed BLS series for fitness centres or personal care |
| Stooq share prices (for owners of nail polish brands) | Now answers with a browser check instead of a CSV. We do not get round those. No share price data added |
| Sport England Active Lives | Worked in the end, by reading the newest workbook linked from their data tables page. The link changes with each release, so that script is the most likely to break |
| ONS CPI price quotes (basic manicure, nail varnish bottle) | Worked. All 113 price quote files are read, see "The manicure index" above. The ONS page links no file for January and February 2017 or January to July 2019, and guessing their addresses got a 404 and then a rate limit, so those nine months are left out. The item index files (which go back to 2005) were not parsed, so there is nothing before 2010 |
| Google Trends | No free API |
| A manicure price in money outside the UK | Not found. Ireland (CSO national average prices) lists three haircuts and no manicure. Poland (GUS local data bank) has a men's haircut only. Russia (Rosstat) does publish a manicure price but its data site refused the request, and we do not get round that. Kazakhstan's data site had no price table we could find and then returned errors. Japan and South Korea need an API key. The US, Canada and Australia publish no price for any salon service, only indexes. Brazil publishes a manicure index, which we used |
| OpenStreetMap count of nail shops | Not added. It is a snapshot with no history |

## Summary

| Lens | Can it be answered now? | Biggest gap |
| --- | --- | --- |
| 1. Pride | Partly | No promotions or dating data, only women in manager jobs and marriages |
| 2. Manual work and sport | Partly | Polish is imports not sales, and the sport series has only ten yearly points, for England |
| 3. By industry | No | No data on who wears polish by industry. Needs a poll (weights are ready) |
| 4. Covid hobbies | Partly | Hobby interest is Wikipedia views by language, so English and Spanish speaking countries are missing |
| 5. Hands or cutlery | Partly | Imports are not purchases, and only 14 countries have an eating style |
| 6. Self care | Yes for the UK, yearly | Nails are mixed with hair, and yoga and Pilates are mixed with gyms |
| 7. Protests | Partly | No weekly salon or polish series, and no count of women protesters |
