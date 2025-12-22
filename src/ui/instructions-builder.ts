import type { CharacterInstructions, SkillInstruction } from '../types/instructions.js';
import type { Character } from '../types/character.js';
import type { Skill } from '../types/skill.js';
import { renderSkillPriorityEditor, calculatePriority } from './skill-priority-editor.js';
import { renderConditionBuilder } from './condition-builder.js';
import { renderTargetingOverrideSelector } from './targeting-override-selector.js';

/**
 * Create default skill instructions from available skills
 * Used when no instructions exist yet
 */
function createDefaultSkillInstructions(availableSkills: Skill[]): SkillInstruction[] {
  return availableSkills.map((skill, index) => ({
    skillId: skill.id,
    priority: calculatePriority(index, availableSkills.length),
    conditions: [],
    enabled: true,
  }));
}

/**
 * Render the main instructions builder panel
 * Coordinates sub-components for character AI configuration
 *
 * @param selectedCharacter - Character being configured (null if none selected)
 * @param instructions - Current instructions for the character (null if none)
 * @param editingSkillId - Currently editing skill ID (null if viewing all)
 * @param isDirty - Whether there are unsaved changes
 * @returns HTML string for the instructions builder panel
 */
export function renderInstructionsBuilder(
  selectedCharacter: Character | null,
  instructions: CharacterInstructions | null,
  editingSkillId: string | null,
  isDirty: boolean
): string {
  // Derive available skills from character
  const availableSkills = selectedCharacter?.skills ?? [];

  // Render empty state if no character selected
  if (selectedCharacter === null) {
    return renderEmptyState();
  }

  // Determine control mode (default to 'ai' if no instructions)
  const controlMode = instructions?.controlMode ?? 'ai';

  // Extract skill instructions or create defaults if empty
  let skillInstructions = instructions?.skillInstructions ?? [];
  if (skillInstructions.length === 0 && availableSkills.length > 0) {
    skillInstructions = createDefaultSkillInstructions(availableSkills);
  }

  // Find selected skill and instruction when editing
  let conditionSlotContent = '';
  let targetingSlotContent = '';
  
  if (editingSkillId !== null) {
    const selectedInstruction = skillInstructions.find(
      (inst) => inst.skillId === editingSkillId
    );
    const selectedSkill = availableSkills.find(
      (skill) => skill.id === editingSkillId
    );

    if (selectedInstruction && selectedSkill) {
      conditionSlotContent = renderConditionBuilder(
        selectedInstruction.conditions,
        null
      );
      targetingSlotContent = renderTargetingOverrideSelector(
        selectedInstruction.targetingOverride,
        selectedSkill.targeting
      );
    }
  }

  // Build character configuration UI
  return `<div class="instructions-builder">
  <div class="instructions-content" data-character-id="${selectedCharacter.id}">
    ${renderCharacterHeader(selectedCharacter, controlMode)}
    
    <!-- Control mode toggle slot -->
    <div class="control-mode-section" id="control-mode-slot"></div>
    
    <!-- Skill editor (visible only in AI mode) -->
    <div class="skill-editor" data-visible="${controlMode === 'ai'}">
      <div class="skill-priority-section" id="skill-priority-slot">${renderSkillPriorityEditor(
        skillInstructions,
        availableSkills,
        editingSkillId
      )}</div>
      
      <!-- Condition/targeting (visible when editing specific skill) -->
      <div class="skill-details">
        <div class="condition-section" id="condition-slot">${conditionSlotContent}</div>
        <div class="targeting-section" id="targeting-slot">${targetingSlotContent}</div>
      </div>
    </div>
    
    <!-- Action buttons -->
    ${renderActionButtons(isDirty)}
  </div>
</div>`;
}

/**
 * Render the empty state when no character is selected
 */
function renderEmptyState(): string {
  return `<div class="instructions-builder">
  <div class="empty-state">
    <p>Select a character to configure their AI behavior</p>
  </div>
</div>`;
}

/**
 * Render the character header with name and control mode
 */
function renderCharacterHeader(
  character: Character,
  controlMode: 'human' | 'ai'
): string {
  return `<div class="character-header">
  <h3>Configuring: ${character.name}</h3>
</div>`;
}

/**
 * Render the action buttons (Apply/Cancel)
 */
function renderActionButtons(isDirty: boolean): string {
  const disabledAttr = isDirty ? '' : ' disabled';
  
  return `<div class="action-buttons">
  <button class="apply-btn" data-action="apply"${disabledAttr}>Apply</button>
  <button class="cancel-btn" data-action="cancel"${disabledAttr}>Cancel</button>
</div>`;
}

