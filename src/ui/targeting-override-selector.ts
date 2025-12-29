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
    'nearest-enemy': 'Nearest Enemy',
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
 * getTargetingModeHelp('nearest-enemy');
 * // Returns: "Targets the nearest living enemy"
 * ```
 */
export function getTargetingModeHelp(mode: TargetingMode): string {
  const helpTexts: Record<TargetingMode, string> = {
    'nearest-enemy': 'Targets the nearest living enemy',
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
    'nearest-enemy',
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
