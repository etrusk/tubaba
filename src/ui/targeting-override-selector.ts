/**
 * Targeting Override Selector Component
 *
 * Renders a selector component for overriding the default targeting mode for a skill.
 * Allows users to change how a skill selects its target(s) in battle.
 *
 * @module ui/targeting-override-selector
 */

import type { TargetingMode } from '../types/skill.js';

/**
 * Get human-readable label for targeting mode
 *
 * @param mode - The targeting mode
 * @returns Human-readable label string
 *
 * @example
 * ```typescript
 * getTargetingModeLabel('single-enemy-lowest-hp');
 * // Returns: "Single Enemy (Lowest HP)"
 * ```
 */
export function getTargetingModeLabel(mode: TargetingMode): string {
  const labels: Record<TargetingMode, string> = {
    'self': 'Self',
    'single-enemy-lowest-hp': 'Single Enemy (Lowest HP)',
    'single-enemy-highest-hp': 'Single Enemy (Highest HP)',
    'all-enemies': 'All Enemies',
    'ally-lowest-hp': 'Ally (Lowest HP)',
    'ally-lowest-hp-damaged': 'Ally (Lowest HP - Damaged)',
    'ally-dead': 'Ally (Dead - for Revive)',
    'all-allies': 'All Allies',
  };

  return labels[mode];
}

/**
 * Get descriptive help text for targeting mode
 *
 * @param mode - The targeting mode
 * @returns Descriptive help text explaining what the mode does
 *
 * @example
 * ```typescript
 * getTargetingModeHelp('single-enemy-highest-hp');
 * // Returns: "Targets the enemy with the highest current HP"
 * ```
 */
export function getTargetingModeHelp(mode: TargetingMode): string {
  const helpTexts: Record<TargetingMode, string> = {
    'self': 'Targets only the character itself',
    'single-enemy-lowest-hp': 'Targets the enemy with the lowest current HP',
    'single-enemy-highest-hp': 'Targets the enemy with the highest current HP',
    'all-enemies': 'Targets all enemies in the battle',
    'ally-lowest-hp': 'Targets the ally with the lowest current HP',
    'ally-lowest-hp-damaged': 'Targets the ally with the lowest HP who is damaged (HP < max)',
    'ally-dead': 'Targets a dead ally (for revival skills)',
    'all-allies': 'Targets all allies in the battle',
  };

  return helpTexts[mode];
}

/**
 * Render the targeting override selector component
 * Allows overriding the default targeting mode for a skill
 *
 * @param currentOverride - Current targeting override (or undefined for default)
 * @param skillDefaultTargeting - The skill's default targeting mode (for help text)
 * @returns HTML string for the selector
 *
 * @example
 * ```typescript
 * const html = renderTargetingOverrideSelector('single-enemy-highest-hp', 'single-enemy-lowest-hp');
 * // Returns:
 * // <div class="targeting-override-selector" data-current-value="single-enemy-highest-hp">
 * //   <label for="targeting-select">Targeting Override</label>
 * //   <select id="targeting-select" data-input="targeting-override">
 * //     <option value="">(Default: Single Enemy Lowest HP)</option>
 * //     <option value="self">Self</option>
 * //     ...
 * //     <option value="single-enemy-highest-hp" selected>Single Enemy (Highest HP)</option>
 * //   </select>
 * //   <p class="targeting-help">Targets the enemy with the highest current HP</p>
 * // </div>
 * ```
 */
export function renderTargetingOverrideSelector(
  currentOverride: TargetingMode | undefined,
  skillDefaultTargeting: TargetingMode
): string {
  // Determine which targeting mode is currently active (override or default)
  const activeMode = currentOverride ?? skillDefaultTargeting;
  const currentValue = currentOverride ?? '';

  // All available targeting modes in order
  const targetingModes: TargetingMode[] = [
    'self',
    'single-enemy-lowest-hp',
    'single-enemy-highest-hp',
    'all-enemies',
    'ally-lowest-hp',
    'ally-lowest-hp-damaged',
    'ally-dead',
    'all-allies',
  ];

  // Generate option elements
  const defaultOptionSelected = currentOverride === undefined ? ' selected' : '';
  const defaultLabel = getTargetingModeLabel(skillDefaultTargeting);
  
  let optionsHtml = `<option value=""${defaultOptionSelected}>(Default: ${defaultLabel})</option>\n`;

  for (const mode of targetingModes) {
    const selected = currentOverride === mode ? ' selected' : '';
    const label = getTargetingModeLabel(mode);
    optionsHtml += `    <option value="${mode}"${selected}>${label}</option>\n`;
  }

  // Get help text for currently active mode
  const helpText = getTargetingModeHelp(activeMode);

  return `<div class="targeting-override-selector" data-current-value="${currentValue}">
  <label for="targeting-select">Targeting Override</label>
  <select id="targeting-select" data-input="targeting-override">
    ${optionsHtml}  </select>
  <p class="targeting-help">${helpText}</p>
</div>`;
}
