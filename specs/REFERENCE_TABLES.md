# Reference Tables

Reference data for game systems. Load this document only when implementing or debugging specific mechanics.

---

## Skills Table

| Skill | Ticks | Target | Effect | Requirement | Channeling |
|-------|-------|--------|--------|-------------|------------|
| Strike | 2 | Enemy | 15 damage | None | No |
| Heavy Strike | 4 | Enemy | 35 damage | None | Yes |
| Fireball | 4 | All enemies | 20 damage each | None | Yes |
| Execute | 3 | Enemy | 50 damage | Target ≤25% HP | No |
| Poison | 2 | Enemy | Apply poisoned 6 ticks | None | No |
| Heal | 3 | Ally | Restore 30 HP (capped at maxHp) | None | No |
| Shield | 2 | Ally | Apply shielded 30 absorb | None | No |
| Defend | 1 | Self | Apply defending 3 ticks | None | No |
| Revive | 4 | KO ally | Restore with 40 HP | Target knocked out | Yes |
| Taunt | 2 | Self | Apply taunting 4 ticks | None | No |
| Bash | 3 | Enemy | 10 damage + stunned 2 ticks | None | No |
| Interrupt | 1 | Enemy | 5 damage + cancel action | Target channeling | No |

**Notes:**
- **Channeling:** Actions with tickCost ≥4 can be interrupted by Interrupt skill
- **Target modes:** See Conditions List for all targeting modes
- **Damage calculation:** Base damage → Defending reduction (50%) → Shield absorption → HP update

---

## Status Effects Table

| Status | Duration | Effect | Reapplication |
|--------|----------|--------|---------------|
| Poisoned | 6 ticks | 5 damage per tick (Phase 4) | Refreshes duration to 6 |
| Stunned | 2 ticks | Cannot act, cancels current action | Refreshes duration to 2 |
| Shielded | 4 ticks | Absorbs up to 30 damage | Resets pool to 30, loses previous |
| Taunting | 4 ticks | Forces enemy targeting (new actions only) | Refreshes duration to 4 |
| Defending | 3 ticks | 50% damage reduction (before shield) | Refreshes duration to 3 |
| Enraged | Until used | Next attack +15 damage (flat bonus) | Cannot stack (enemy-only status) |

**Notes:**
- **Duration:** Decrements during Phase 4 (Status Effects), expires at 0
- **Stacking:** Enraged cannot stack; other statuses refresh duration
- **Application order:** Substep 5 of Phase 3 (Action Resolution)
- **Interaction:** Defending reduction applies before Shield absorption

---

## Enemies Table

| Enemy | Health | Skills | AI Summary |
|-------|--------|--------|------------|
| Grunt | 40 | Slash (12 dmg, 2 ticks) | Attacks taunter if present, else lowest HP player |
| Brute | 80 | Heavy Slash (30 dmg, 4 ticks), Slash | Heavy Slash on taunter, else Slash lowest HP |
| Shaman | 30 | Poison Bolt (apply poisoned, 2 ticks) | Always targets Character A (fixed targeting) |
| Healer | 35 | Dark Heal (25 HP, 3 ticks), Slash | Heals ally below 50% HP, else Slash lowest HP (ignores taunt) |
| Warlord | 200 | Heavy Slash, Ground Slam (15 AOE, 4 ticks), Enrage | Enrages when below 50% HP (once), AOE if >2 players alive, else Heavy Slash lowest HP |

**Notes:**
- **Grunt/Brute:** Taunt-responsive melee enemies
- **Shaman:** Predictable targeting enables positioning strategy
- **Healer:** Support AI, taunt-immune healing
- **Warlord:** Boss with phase transition (Enrage at 50% HP)
- **AI Rules:** Enemies use skill.rules defined in their character data

---

## Conditions List

### Self Conditions (8)
Evaluate character's own state:
- `hp-below-25` - Character HP ≤ 25% of maxHp
- `hp-below-50` - Character HP ≤ 50% of maxHp
- `hp-below-75` - Character HP ≤ 75% of maxHp
- `hp-above-50` - Character HP > 50% of maxHp
- `hp-above-75` - Character HP > 75% of maxHp
- `has-poisoned` - Character has poisoned status
- `has-stunned` - Character has stunned status
- `has-no-negative-status` - Character has no poisoned/stunned

### Ally Conditions (5)
Evaluate teammates (excludes self):
- `ally-below-25` - Any ally HP ≤ 25% of maxHp
- `ally-below-50` - Any ally HP ≤ 50% of maxHp
- `ally-below-75` - Any ally HP ≤ 75% of maxHp
- `lowest-hp-ally` - Ally with absolute lowest HP exists
- `ally-knocked-out` - Any ally currentHp ≤ 0

### Enemy Conditions (4)
Evaluate opponents:
- `enemy-alive` - Any enemy currentHp > 0
- `enemy-lowest-hp` - Enemy with absolute lowest HP exists
- `enemy-highest-hp` - Enemy with absolute highest HP exists
- `enemy-channeling` - Any enemy has action with tickCost ≥4

### Universal Condition (1)
Always true:
- `always` - No conditions, always matches

### Enemy-Only Conditions (3)
Special conditions for enemy AI:
- `player-taunting` - Any player character has taunting status
- `self-below-hp-not-enraged` - Self HP below threshold AND not enraged (boss mechanic)
- `players-alive-greater-than-N` - More than N player characters alive

**Notes:**
- **AND logic:** All conditions in a rule must be true for rule to match
- **HP comparisons:** Use absolute HP values, not percentages
- **Evaluation timing:** Phase 1 (Rule Evaluation) at tick start

---

## Encounters Table

| # | Name | Enemies | Scaling | Purpose |
|---|------|---------|---------|---------|
| 1 | First Blood | 1 Grunt | 1.0× | Teaches basic rules and targeting |
| 2 | Duo | 2 Grunts | 1.0× | Teaches target priority and focus fire |
| 3 | Poison Introduction | 1 Grunt, 1 Shaman | 1.0× | Introduces status effects and Shaman's fixed targeting |
| 4 | Sustained Fight | 1 Grunt, 1 Shaman, 1 Healer | 1.1× | Teaches focus fire on priority targets (kill Healer first) |
| 5 | Damage Check | 1 Brute | 1.2× | Tests defensive play and damage output |
| 6 | Boss | 1 Warlord | 1.0× | Final test combining all mechanics (Enrage, AOE, phase transition) |

**Notes:**
- **Scaling:** Multiplier applied to enemy HP and damage
- **Progression:** Each encounter teaches new mechanic or requires new tactic
- **Boss:** Warlord uses all enemy AI patterns (priority targets, AOE conditions, self-buff)
- **Skill Offerings:** After encounters 1-5, pick 1 of 3 skills to add to party
