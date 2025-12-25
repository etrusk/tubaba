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
}

/**
 * Renders a skill element with tooltip
 * 
 * Produces HTML with:
 * - Colored skill name
 * - Optional duration indicator
 * - Hover tooltip with effects and targeting
 * 
 * @param skill - Pre-formatted skill view model
 * @param options - Rendering options
 * @returns HTML string with skill name and CSS tooltip
 * 
 * @example
 * ```typescript
 * const html = renderSkillDisplay(skill);
 * // <span class="skill-display" style="color: #f44336;" data-skill-id="strike">
 * //   Strike
 * //   <span class="skill-duration">(2 ticks)</span>
 * //   <span class="skill-tooltip">...</span>
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
  
  const tooltipHtml = `<span class="skill-tooltip">
    <strong>${skill.name}</strong> (${skill.formattedDuration})<br>
    ${skill.effectsSummary}<br>
    <em>${skill.targetingDescription}</em>
  </span>`;
  
  return `<${tag} class="${classes}" style="color: ${skill.color};" data-skill-id="${skill.id}">
  ${skill.name}
  ${durationHtml}
  ${tooltipHtml}
</${tag}>`;
}
