# MonstersGame – Research Reference

> Sources: [Gamicus Wiki](https://gamicus.fandom.com/wiki/MonstersGame), [MG Wiki (Arcadewelten)](https://mgwiki.arcadewelten.eu/index.php?title=Hauptseite/en), [Official Rules (UK1)](https://uk1.monstersgame.moonid.net/index.php?ac=anleitung), [MoonID Portal](https://moonid.net/games/monstersgame/)

---

## Game Overview

- Browser-based PvP RPG by **CRATR.games** (formerly RedMoon Studios), running since 2005
- Choose **Vampire** or **Werewolf**, war between races
- Servers in many languages; ES1 is the Spanish server GrimAutomata targets
- Auth via **MoonID** portal (OAuth-style redirect chain)

---

## Core Attributes (5 stats)

| Attribute                      | German       | Spanish     | Effect                                      |
| ------------------------------ | ------------ | ----------- | ------------------------------------------- |
| **Strength**             | Stärke      | Fuerza      | Damage dealt on hit                         |
| **Defense**              | Verteidigung | Defensa     | Block/evade chance                          |
| **Agility**              | Gewandtheit  | Agilidad    | Hit chance                                  |
| **Stamina/Constitution** | Ausdauer     | Resistencia | Damage mitigation, fight endurance          |
| **Dexterity**            | Charisma     | Destreza    | Search success, reduces enemy hideout bonus |

**Training cost formula:** `Cost = (currentLevel - 5)²`

---

## Health / Stamina System

- Called **"Lebensenergie"** (DE) / **"Energía vital"** (ES) in-game
- Regenerates **10 points/hour** automatically
- **Below 25 HP**: Cannot raid or manhunt
- **Below 10 HP in combat**: Automatic loss
- Max HP increases each level-up

---

## Potions (Tränke / Pociones)

### Energy Potions (Lebensenergie / Energía vital)

| ID | Potion               | HP Restored | Wiki Price (DE) | ES1 Price (observed) | Sell Price | Req Level |
| -- | -------------------- | ----------- | --------------- | -------------------- | ---------- | --------- |
| 1  | Lebensenergie (50)   | 50          | 50 gold         | **49 gold**          | 25         | L1        |
| 2  | Lebensenergie (100)  | 100         | 90 gold         | **89 gold**          | 45         | L2        |
| 7  | Lebensenergie (500)  | 500         | 450 gold        | **445 gold**         | 225        | L10       |
| 8  | Lebensenergie (1000) | 1000        | 900 gold        | **891 gold**         | 450        | L20       |
| 10 | Lebensenergie (2500) | 2500        | 2,200 gold      | unknown              | 1,100      | L40       |
| 11 | Lebensenergie (5000) | 5000        | 4,250 gold      | unknown              | 2,125      | L60       |

> **ES1 Price Note:** ES1 prices are ~1-2% lower than wiki base prices, likely due to accomplishment discounts. The code uses ES1 observed prices since those match the `cur_price` hidden form field the server expects for purchases.

### Skill Potions (Skilltränke)

| Potion                | Effect         | Duration | Buy Price   | Req Level |
| --------------------- | -------------- | -------- | ----------- | --------- |
| Ahnen-Trank (+3)      | +3 all skills  | 1 hour   | 500 gold    | L1        |
| Urahnen-Trank (+6)    | +6 all skills  | 1 hour   | 750 gold    | L3        |
| Ältesten-Trank (+9)  | +9 all skills  | 1 hour   | 1,000 gold  | L6        |
| Ältesten-Trank (+15) | +15 all skills | 1 hour   | 10,000 gold | L30       |
| Ältesten-Trank (+25) | +25 all skills | 1 hour   | 20,000 gold | L50       |

> **Note:** Only one skill potion active at a time (stacking = no benefit). Can be used in Ancestral fights.

### Permanent Potion

| Potion              | Effect                 | Buy Price  | Req Level |
| ------------------- | ---------------------- | ---------- | --------- |
| Lebensenergie (+10) | +10 max HP permanently | 2,000 gold | L5        |

---

## Graveyard (Friedhof) — `?ac=friedhof`

- Work **1–12 hours**, cancelable within first 10 minutes
- **Cannot do other actions while working**
- Pay scales with level (26 job tiers)
- Can find items (weapons, armor, rings, potions) while working
- Form param: `arbeitszeit` (hours), `sac=startjob`

### Job Tiers (selected)

| Job                           | Level | Gold/hr | Gold in 12h |
| ----------------------------- | ----- | ------- | ----------- |
| Totengräber                  | 1     | 5       | 60          |
| Grabpfleger                   | 3     | 10      | 120         |
| Leichenrestaurator            | 6     | 20      | 240         |
| Friedhofswächter             | 10    | 40      | 480         |
| Sargbauer                     | 15    | 80      | 960         |
| Leichenbestatter              | 20    | 120     | 1,440       |
| Leichensezierer               | 25    | 180     | 2,160       |
| Grabsteinmetz                 | 30    | 250     | 3,000       |
| Friedhofsgärtner             | 35    | 350     | 4,200       |
| Friedhofsverwalter            | 40    | 500     | 6,000       |
| Totenpriester                 | 50    | 750     | 9,000       |
| Exhumierer                    | 60    | 1,000   | 12,000      |
| Friedhofsbesitzer             | 70    | 1,250   | 15,000      |
| Seelenhändler                | 80    | 1,500   | 18,000      |
| Totenbeschwörer              | 90    | 1,750   | 21,000      |
| Höllentorhüter              | 100   | 2,000   | 24,000      |
| Sensenmann                    | 125   | 2,500   | 30,000      |
| Höllenpriester               | 140   | 2,750   | 33,000      |
| Dämonischer Bote             | 155   | 3,000   | 36,000      |
| Apokalyptischer Reiter        | 170   | 3,250   | 39,000      |
| Dämonenfürst                | 185   | 3,500   | 42,000      |
| Wächter der neun Kreise      | 200   | 3,750   | 45,000      |
| Älteste Furie                | 215   | 4,000   | 48,000      |
| Priester der heiligen Siegel  | 230   | 4,250   | 51,000      |
| Erzdämon                     | 245   | 4,500   | 54,000      |
| Herrscher der niederen Ebenen | 260   | 4,750   | 57,000      |

---

## Manhunt (Menschenjagd) — `?ac=raubzug`

- Costs **10 gold** to start
- **60 min/day** (non-premium), **120 min/day** (premium)
- In **10-minute increments**
- Form params: `sac=vampir` (vampire), `jagdzeit` (seconds)

### Location Tiers & Loot Formulas

| Location                 | Loot Formula                          | Gold Range (at Level 0) |
| ------------------------ | ------------------------------------- | ----------------------- |
| Dorf (Village)           | `3 + 0.15 × rand(0–15) + Level`   | 3 – 7.5                |
| Kleinstadt (Small Town)  | `10 + 0.5 × rand(0–15) + Level`   | 10 – 25                |
| Stadt (City)             | `50 + 2.5 × rand(0–15) + Level`   | 50 – 125               |
| Großstadt (Big City)    | `250 + 12.5 × rand(0–15) + Level` | 250 – 625              |
| Miss (trashcan/lamppost) | ~5% chance                            | 0                       |

### XP by Loot Amount

| Loot Range    | XP Earned |
| ------------- | --------- |
| 0 – 100      | 2 EP      |
| 100.01 – 140 | 4 EP      |
| 140.01 – 180 | 6 EP      |
| 180.01 – 220 | 8 EP      |
| 220.01+       | 10 EP     |

### Optimal Manhunt Strategy (from wiki)

**Non-Premium:** Safety fight → 3×10min manhunt → Safety fight → 3×10min manhunt → Safety fight

**Premium:** Safety fight → 4×10min manhunt → Safety fight → 4×10min manhunt → Safety fight → 4×10min manhunt → Safety fight

---

## PvP Raids — `?ac=raubzug`

- Search every **15 min** (5 min premium)
- **1 gold** to search
- Winner gets **5–10%** of loser's gold
- **1 hour protection** after any battle
- **12 hour lock** vs same opponent (4 attacks in 12h during clan wars)
- Players with **< 25 HP** cannot raid or be raided
- Form params: `sac=gegner` (search), `sac=attack` + `gegnerid` (attack)
- Search options: `searchname`, `searchopt`

### XP Rules

| Scenario           | Attacker XP | Defender XP |
| ------------------ | ----------- | ----------- |
| Beat higher level  | 2           | 0           |
| Beat same level    | 1           | 1           |
| Beat lower level   | 0           | 1           |
| Lose to same level | 1           | 1           |

---

## Ancestral Site (Ahnenstätte) — `?ac=ahnenstaette`

- Unlocks at **Level 20**
- Requires **minimum 100 HP** and a gold fee
- Challenge **once per 24 hours**
- Beat ancestor → learn special ability (+5 to a stat per level trained)
- New ability slots at L20, L40, L60, L80 (max 4 abilities)
- **No sentinel** in ancestor fights
- Abilities only active in combat vs **Level 20+** opponents
- Form: `mision=true`, `schwierigkeit=0|1|2` (easy/medium/hard), `go=Aceptar`

### Special Abilities

| Race               | +Strength                | +Agility           | +Stamina               | +Defense              |
| ------------------ | ------------------------ | ------------------ | ---------------------- | --------------------- |
| **Vampire**  | Blood Rage (Blutrausch)  | Doppelgänger      | Toughness (Zähigkeit) | Stoneskin (Steinhaut) |
| **Werewolf** | Barbaric Rage (Wildheit) | Reflexes (Reflexe) | Berserker              | Fire (Feuer)          |

---

## URL Structure

| Page            | URL Pattern                     |
| --------------- | ------------------------------- |
| Status/Overview | `?ac=status`                  |
| Raid/Manhunt    | `?ac=raubzug`                 |
| Graveyard       | `?ac=friedhof`                |
| Training        | `?ac=training`                |
| Store           | `?ac=stadt&sac=warenhaendler` |
| Ancestral Site  | `?ac=ahnenstaette`            |
| Arena           | `?ac=arena`                   |
| Clan            | `?ac=clan`                    |
| Settings        | `?ac=settings`                |
| Help/Rules      | `?ac=anleitung`               |
| Inventory       | `?ac=inventar`                |
| Premium         | `?ac=premium`                 |

---

## Server List (selected)

| Server               | Language        | Domain Pattern                   |
| -------------------- | --------------- | -------------------------------- |
| ES1                  | Spanish         | `es1.monstersgame.moonid.net`  |
| UK1                  | British English | `uk1.monstersgame.moonid.net`  |
| INT3 (Blood & Flesh) | International   | `int3.monstersgame.moonid.net` |
| DE1                  | German          | `de1.monstersgame.moonid.net`  |

---

## Accomplishments System

- Unlimited accomplishments can be owned
- Only **5 active at once** (in one "set")
- Premium players get 2 sets, non-premium 1 (can own up to 5 sets)
- Each set holds up to 5 accomplishments
- Bonuses: battle modifiers, shop discounts, training discounts, manhunt bonuses
- Deactivating mid-action loses the bonus

---

## Sentinels (Wächter)

- Available from **Level 5**
- 60+ sentinels, each with Strength/Defense/Stamina base attributes
- Training cost: `1 gold → 4 gold → 9 gold...` (squares)
- Attributes add to player stats in combat (shown separately in battle report)
- Can be sold back at **full purchase price** (but training gold is lost)
- Used as **gold banks** — buy sentinel to protect gold, sell when needed

---

## Hideout (Unterschlupf)

- Defense bonus when attacked at home
- Makes it harder for enemies to find you
- Upgradeable components:
  - Surroundings (0–7)
  - Path (0–10)
  - Wall (0–12)
  - Building (0–23)

---

## Game Rules

### Other Key Rules

- **Rule 14:** Repeat attacks are NOT harassment (confirmed game design)

---

## Known Code vs Game Discrepancies

| Issue                              | Current Code              | Actual Game Value                 |
| ---------------------------------- | ------------------------- | --------------------------------- |
| "Stamina" naming                   | Used for HP/Energía vital | HP ≠ Constitution attribute       |
| Manhunt `sac` param for werewolves | Uses `sac=vampir`         | May need separate werewolf value  |
| ES1 potion prices differ from wiki | Wiki: 50, 90, 450, 900  | ES1: 49, 89, 445, 891 (accomplishment discount?) |
| PvP battle XP text format          | `puntos de experiencia`  | `punto(s) de experiencia` (parenthesized plural) |
| PvP rival name HTML                | `<h3>contra Name</h3>`   | `<div class="headerRow">Race Name</div>`          |

---

*Last updated: February 7, 2026*
