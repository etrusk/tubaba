/**
 * Control Mode Toggle Component
 *
 * Renders a toggle component for switching between Human (manual) and AI (automated)
 * control modes for character behavior.
 *
 * @module ui/control-mode-toggle
 */

/**
 * Render the control mode toggle component
 * Allows switching between Human and AI control modes
 *
 * @param currentMode - Current control mode ('human' | 'ai')
 * @returns HTML string for the toggle component
 *
 * @example
 * ```typescript
 * const html = renderControlModeToggle('ai');
 * // Returns:
 * // <div class="control-mode-toggle" data-mode="ai">
 * //   <div class="toggle-buttons">
 * //     <button class="toggle-btn" data-action="set-human">👤 Human</button>
 * //     <button class="toggle-btn active" data-action="set-ai">🤖 AI</button>
 * //   </div>
 * //   <p class="mode-help">Character follows configured rules automatically</p>
 * // </div>
 * ```
 */
export function renderControlModeToggle(
  currentMode: 'human' | 'ai'
): string {
  const humanActive = currentMode === 'human' ? ' active' : '';
  const aiActive = currentMode === 'ai' ? ' active' : '';

  const helpText = currentMode === 'human'
    ? 'You will manually control this character'
    : 'Character follows configured rules automatically';

  return `<div class="control-mode-toggle" data-mode="${currentMode}">
  <div class="toggle-buttons">
    <button class="toggle-btn${humanActive}" data-action="set-human">
      👤 Human
    </button>
    <button class="toggle-btn${aiActive}" data-action="set-ai">
      🤖 AI
    </button>
  </div>
  <p class="mode-help">${helpText}</p>
</div>`;
}
