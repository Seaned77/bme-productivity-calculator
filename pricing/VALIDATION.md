# April 2026 pricing validation

Prices and standalone/system installation rates use the retail and installation columns of `CPBourg Inc Official Price List Partners 2026-04-01 +Service.pdf`, cross-checked with the accompanying workbook. Prices are rounded to the published cents before quantity multiplication. Tariff is 10% of eligible purchased hardware, rounded once on the aggregate; line tariffs reconcile to that aggregate. Challenge CMT hardware and the Unlimited license are exempt.

One main component receives the standalone installation rate. Additional units and other components use system rates. Priority is binder/booklet maker, BPM, CMT, BSF, BBL/BBC, then the highest-priced serviceable accessory. An accessory-only upgrade uses its new main component at standalone rate. Owned hardware is never purchased or tariffed. Owned equipment is excluded from installation by default; the explicit installation-scope checkbox includes its system service and allows an owned main component to anchor installation. Installation overrides are separate and visibly identified, including a zero override.

## Revised Ricoh reference

Source: `2026-10-08.104.2330.01_Ricoh_Americas_Corporation_6ac6fdfb0269a.pdf`.

BB3002 EVA, BSF left-to-right, BSF GUI, registration plate/jacks, BBC, Bourg Box, Connex cable, CMT-130TC, landscape conveyor, cooling elevator, vertical stacker and waste wagon, each quantity 1.

| Component | Quote | Calculator |
| --- | ---: | ---: |
| Equipment | $311,067.51 | $311,067.51 |
| Eligible Bourg hardware | $202,285.75 | $202,285.75 |
| Tariff | $20,228.57 | $20,228.58 |
| Installation | $10,550.00 | $10,550.00 |
| Total | $341,846.08 | $341,846.09 |

The quoted tariff is one cent below rounding 10% of the displayed eligible prices. The calculator preserves its published-price rounding policy and discloses the one-cent difference rather than adding an unexplained adjustment. Connex CPB0000684 is $849.95 in this quote and absent from the master sheet. Its service rate is unlisted, so the app explicitly warns that service is included with CMT system installation and standalone service needs confirmation.

## Revised Visual Edge reference

Source: `2026-09-30.104.2330.03_Visual_Edge_IT_6ac40a842939b.pdf` (pricing table issued October 5, 2026).

Purchased: BBM 2 Hohner heads ×1, BPM ×2, bleed/trim ×1, one extra slot ×1, bottom micro-perforation ×2, docking plate ×1, Unlimited license ×1, BBM BSE ×1, BBM face trimmer ×1. BSF and IFB have purchase quantity 0 and owned quantity 1.

| Component | Quote and calculator |
| --- | ---: |
| Equipment including license | $275,364.85 |
| Eligible hardware | $261,079.14 |
| Tariff | $26,107.91 |
| Installation | $10,200.00 |
| Total | $311,672.76 |

Installation: $3,650 BBM + 2 × $1,650 BPM + $650 bleed/trim + 2 × $650 micro-perforation + $650 BSE + $650 face trim = $10,200. No equipment, tariff or default installation is charged for the owned BSF/IFB. Explicitly including the owned equipment in service adds $650 for BSF.

The master sheet identifies the Unlimited license as CPB0001317 while the quote uses CPB0001373. The app uses the master identifier and flags the discrepancy for order confirmation. Docking plate system installation is blank in one master row and zero in a duplicate BM-e row; zero is used with an explicit confirmation note.

## Verification

Run `node tests/pricing.cjs`. Covers both references, owned equipment, accessory-only upgrades, quantity-aware installation, multiple CMT units, tariff exemptions, zero installation overrides, clear all and invalid quantities. Browser verification covers desktop/mobile layouts, quantity changes, invalid-input recovery, presets, BBM/BM-e accessories, manual BB3002, BB3102 loader upgrades, BB3202 requirements, both CMT models, PUR-C price and owned requirements without duplicate purchases.
