import type { Character } from '../types/character.js';
import type { CombatState } from '../types/combat.js';
import type { Skill, Rule } from '../types/skill.js';
import type { CharacterInstructions } from '../types/instructions.js';
import { evaluateCondition } from './rule-condition-evaluator.js';
import { selectTargets } from '../targeting/target-selector.js';
import TargetFilter from '../targeting/target-filter.js';

/**
 * Result of skill selection
 */
export interface SkillSelection {
  skill: Skill;
  targets: Character[];
}

/**
 * Selects a skill and targets for a character based on AI rules or instructions.
 *
 * @param character - The character making the decision
 * @param combatState - Current combat state
 * @param instructions - Optional character instructions (overrides skill.rules if provided)
 * @returns Selected skill and targets, or null if no valid action
 */
export function selectAction(
  character: Character,
  combatState: CombatState,
  instructions?: CharacterInstructions
): SkillSelection | null {
  // 1. Early exits
  if (character.currentHp <= 0) {
    return null;
  }
  
  if (!character.skills || character.skills.length === 0) {
    return null;
  }
  
  // 2. Collect all rules with their skills
  interface RuleSkillPair {
    rule: Rule;
    skill: Skill;
  }
  
  const ruleSkillPairs: RuleSkillPair[] = [];
  
  // If instructions provided, use them instead of skill.rules
  if (instructions && instructions.controlMode === 'ai') {
    for (const skillInstruction of instructions.skillInstructions) {
      // Skip disabled instructions
      if (!skillInstruction.enabled) {
        continue;
      }
      
      // Find the matching skill
      const skill = character.skills.find(s => s.id === skillInstruction.skillId);
      if (!skill) {
        continue;
      }
      
      // Create rule from instruction
      const rule: Rule = {
        priority: skillInstruction.priority,
        conditions: skillInstruction.conditions,
        targetingOverride: skillInstruction.targetingOverride
      };
      
      ruleSkillPairs.push({ rule, skill });
    }
  } else {
    // Fall back to skill.rules (legacy behavior)
    for (const skill of character.skills) {
      if (!skill.rules || skill.rules.length === 0) {
        // Skills without rules are treated as always-matching with empty conditions
        ruleSkillPairs.push({
          rule: { priority: 0, conditions: [] },
          skill
        });
      } else {
        for (const rule of skill.rules) {
          ruleSkillPairs.push({ rule, skill });
        }
      }
    }
  }
  
  // 3. Sort by priority (descending) - stable sort preserves original order for ties
  ruleSkillPairs.sort((a, b) => b.rule.priority - a.rule.priority);
  
  // 4. Evaluate rules in order
  for (const { rule, skill } of ruleSkillPairs) {
    // Check all conditions (AND logic)
    const allConditionsMet = rule.conditions.every(condition =>
      evaluateCondition(condition, character, combatState)
    );
    
    if (!allConditionsMet) {
      continue; // Skip to next rule
    }
    
    // 5. Select targets
    const targetingMode = rule.targetingOverride ?? skill.targeting;
    
    // For enemy casters (isPlayer = false):
    // - "allies" means other enemies (pass combatState.enemies as players param)
    // - "enemies" means players (pass combatState.players as enemies param)
    const targets = selectTargets(
      targetingMode,
      character,
      combatState.enemies, // allies for the enemy (passed as players param)
      combatState.players  // enemies for the enemy (passed as enemies param)
    );
    
    // Apply filters (taunt forcing, dead exclusion)
    const filteredTargets = TargetFilter.applyFilters(
      targets,
      combatState.players,
      combatState.enemies,
      !character.isPlayer
    );
    
    // 6. Validate and return
    if (filteredTargets.length === 0) {
      continue; // No valid targets, try next rule
    }
    
    return {
      skill,
      targets: filteredTargets
    };
  }
  
  // No rules matched or no valid targets for any rule
  return null;
}
