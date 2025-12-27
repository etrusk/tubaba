/**
 * SkillDisplay Component
 * 
 * Reusable component for rendering skills with consistent styling and tooltips.
 * Uses CSS-only tooltips for discovery of skill effects and targeting.
 */

import type { SkillViewModel } from '../types/view-models.js';

/**
 * Options for customizing skill display rendering
 */
export interface SkillDisplayOptions {
  /** Show duration indicator (default: true) */
  showDuration?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Render as inline span vs block div (default: inline) */
  inline?: boolean;
  /** Adds hover/select styles for interactive skill selection (default: false) */
  selectable?: boolean;
  /** Marks skill as currently selected with gold border (default: false) */
  selected?: boolean;
  /** Greyed out, non-interactive state for innate skills (default: false) */
  disabled?: boolean;
  /** Override targeting description for tooltip (default: use skill's targetingDescription) */
  targetingOverride?: string;
}

/**
 * Renders a skill element with tooltip via data attributes
 *
 * Produces HTML with:
 * - Colored skill name
 * - Optional duration indicator
 * - Data attributes for global tooltip (no inline tooltip element)
 *
 * @param skill - Pre-formatted skill view model
 * @param options - Rendering options
 * @returns HTML string with skill name and tooltip data attributes
 *
 * @example
 * ```typescript
 * const html = renderSkillDisplay(skill);
 * // <span class="skill-display" style="color: #f44336;"
 * //       data-skill-id="strike" data-tooltip-name="Strike" ...>
 * //   Strike
 * //   <span class="skill-duration">(2 ticks)</span>
 * // </span>
 * ```
 */
export function renderSkillDisplay(
  skill: SkillViewModel,
  options?: SkillDisplayOptions
): string {
  const showDuration = options?.showDuration ?? true;
  const className = options?.className ?? '';
  const inline = options?.inline ?? true;
  const selectable = options?.selectable ?? false;
  const selected = options?.selected ?? false;
  const disabled = options?.disabled ?? false;
  
  const tag = inline ? 'span' : 'div';
  
  // Build class list with modifier classes
  const classes = [
    'skill-display',
    selectable ? 'skill-display--selectable' : '',
    selected ? 'skill-display--selected' : '',
    disabled ? 'skill-display--disabled' : '',
    className
  ].filter(Boolean).join(' ');
  
  const durationHtml = showDuration
    ? `<span class="skill-duration">(${skill.formattedDuration})</span>`
    : '';
  
  // Escape HTML entities in tooltip content for data attributes
  const escapeHtml = (text: string) => text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  
  // Use override targeting if provided, otherwise use skill's default
  const targetingDescription = options?.targetingOverride ?? skill.targetingDescription;
  
  return `<${tag} class="${classes}" style="color: ${skill.color};"
    data-skill-id="${skill.id}"
    data-tooltip-name="${escapeHtml(skill.name)}"
    data-tooltip-duration="${escapeHtml(skill.formattedDuration)}"
    data-tooltip-effects="${escapeHtml(skill.effectsSummary)}"
    data-tooltip-targeting="${escapeHtml(targetingDescription)}">
  ${skill.name}
  ${durationHtml}
</${tag}>`;
}
