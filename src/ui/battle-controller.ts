import type { CombatState, Character } from '../types/index.js';
import type {
  InstructionsBuilderState,
  CharacterInstructions
} from '../types/instructions.js';
import type { Condition, TargetingMode } from '../types/skill.js';
import type { ActionForecast } from '../types/forecast.js';
import type { BattleViewModel } from '../types/view-models.js';
import { TickExecutor } from '../engine/tick-executor.js';
import { applyInstructionsToCharacter, createDefaultInstructions } from './instructions-converter.js';
import { forecastNextActions } from './action-forecast-analyzer.js';
import { ViewModelFactory } from './view-model-factory.js';

/**
 * Deep clone utility for state management
 */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Deep freeze an object to make it immutable
 * Recursively freezes all nested objects
 */
function deepFreeze<T>(obj: T): T {
  // Freeze the object itself
  Object.freeze(obj);

  // Recursively freeze all properties
  Object.getOwnPropertyNames(obj).forEach(prop => {
    const value = (obj as any)[prop];
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  });

  return obj;
}

/**
 * Time provider interface for dependency injection (testing)
 */
export interface TimeProvider {
  setTimeout(callback: () => void, ms: number): any;
  clearTimeout(id: any): void;
}

/**
 * Default time provider using native setTimeout/clearTimeout
 */
const defaultTimeProvider: TimeProvider = {
  setTimeout: (callback: () => void, ms: number) => setTimeout(callback, ms),
  clearTimeout: (id: any) => clearTimeout(id),
};

/**
 * BattleController - Manages battle playback, step controls, and history
 *
 * Provides controls for stepping through battle ticks, playing/pausing auto-stepping,
 * speed control, and navigating through battle history.
 */
export class BattleController {
  private readonly MAX_HISTORY = 50;
  private initialState: CombatState;
  private currentState: CombatState;
  private history: CombatState[];
  private currentHistoryIndex: number;
  private playbackTimer: any;
  private speed: number;
  private playing: boolean;
  private timeProvider: TimeProvider;
  
  // Instructions state (separate from combat history)
  private instructionsState: InstructionsBuilderState;
  private appliedInstructions: Map<string, CharacterInstructions>;
  
  // Forecast cache
  private forecastCache: ActionForecast | null;
  
  // View model cache
  private viewModelCache: BattleViewModel | null;

  constructor(initialState: CombatState, timeProvider: TimeProvider = defaultTimeProvider) {
    // Initialize instructions for all characters using their ACTUAL skills
    const instructions = new Map<string, CharacterInstructions>();
    for (const player of initialState.players) {
      instructions.set(player.id, createDefaultInstructions(player));
    }
    for (const enemy of initialState.enemies) {
      instructions.set(enemy.id, createDefaultInstructions(enemy));
    }
    
    // Apply default instructions to state
    const stateWithInstructions = {
      ...initialState,
      players: initialState.players.map(player => {
        const inst = instructions.get(player.id);
        return inst ? applyInstructionsToCharacter(player, inst) : player;
      }),
      enemies: initialState.enemies.map(enemy => {
        const inst = instructions.get(enemy.id);
        return inst ? applyInstructionsToCharacter(enemy, inst) : enemy;
      })
    };
    
    // Deep clone and freeze the initial state to ensure immutability
    this.initialState = deepFreeze(deepClone(stateWithInstructions));
    this.currentState = this.initialState;
    this.history = [this.initialState];
    this.currentHistoryIndex = 0;
    this.playbackTimer = null;
    this.speed = 1.0;
    this.playing = false;
    this.timeProvider = timeProvider;
    this.forecastCache = null;
    this.viewModelCache = null;
    
    this.instructionsState = {
      selectedCharacterId: null,
      instructions,
      editingSkillId: null,
      isDirty: false
    };
    
    // Track applied instructions separately for discard functionality
    this.appliedInstructions = new Map(
      Array.from(instructions.entries()).map(([id, inst]) => [
        id,
        JSON.parse(JSON.stringify(inst)) // Deep clone
      ])
    );
  }

  /**
   * Get current combat state (frozen - immutable)
   */
  getCurrentState(): CombatState {
    return this.currentState;
  }

  /**
   * Get full history of combat states (safe to return directly - immutable via Immer)
   */
  getHistory(): CombatState[] {
    return this.history;
  }

  /**
   * Get current tick number
   */
  getCurrentTick(): number {
    return this.currentState.tickNumber;
  }

  /**
   * Advance one tick forward
   * Uses TickExecutor to compute next state and saves to history
   * No-op if battle has already ended
   */
  step(): void {
    // No-op if battle has ended
    if (this.currentState.battleStatus !== 'ongoing') {
      return;
    }

    // Deep clone current state and execute tick
    const stateCopy = deepClone(this.currentState);
    const result = TickExecutor.executeTick(stateCopy, this.instructionsState.instructions);
    const nextState = deepFreeze(result.updatedState);

    this.currentState = nextState;

    // Append to history
    this.history.push(nextState);

    // Prune old history if exceeding limit
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift(); // Remove oldest entry
    }

    // Update index to point to current state
    this.currentHistoryIndex = this.history.length - 1;

    // Invalidate forecast cache
    this.forecastCache = null;
    
    // Invalidate view model cache
    this.viewModelCache = null;

    // Auto-stop playback if battle just ended
    if (this.currentState.battleStatus !== 'ongoing') {
      this.playing = false;
    }
  }

  /**
   * Step back one tick in history
   * No-op if already at initial state
   */
  stepBack(): void {
    // No-op if at initial state
    if (this.currentHistoryIndex <= 0) {
      return;
    }

    // Move back one in history (safe to assign directly - immutable via Immer)
    this.currentHistoryIndex--;
    this.currentState = this.history[this.currentHistoryIndex]!;
    
    // Invalidate view model cache
    this.viewModelCache = null;
  }

  /**
   * Start auto-stepping (playback)
   * No-op if already playing
   */
  play(): void {
    // No-op if already playing
    if (this.playing) {
      return;
    }

    this.playing = true;
    this.scheduleNextTick();
  }

  /**
   * Schedule the next tick based on current speed
   */
  private scheduleNextTick(): void {
    if (!this.playing) return;

    const interval = 1000 / this.speed;

    this.playbackTimer = this.timeProvider.setTimeout(() => {
      if (!this.playing) return;

      this.step();

      // Invalidate forecast cache after step
      this.forecastCache = null;

      // Continue scheduling if still playing (step() sets playing=false when battle ends)
      if (this.playing) {
        this.scheduleNextTick();
      }
    }, interval);
  }

  /**
   * Stop auto-stepping
   * No-op if not playing
   */
  pause(): void {
    this.playing = false;
    if (this.playbackTimer) {
      this.timeProvider.clearTimeout(this.playbackTimer);
      this.playbackTimer = null;
    }
  }

  /**
   * Check if currently auto-stepping
   */
  isPlaying(): boolean {
    return this.playing;
  }

  /**
   * Set playback speed multiplier
   * 1.0 = 1000ms per tick (default)
   * 2.0 = 500ms per tick (2x speed)
   * 0.5 = 2000ms per tick (0.5x speed)
   * 
   * Can be changed during playback
   */
  setSpeed(multiplier: number): void {
    const wasPlaying = this.playing;
    
    // If playing, restart with new speed
    if (wasPlaying) {
      this.pause();
    }
    
    this.speed = multiplier;
    
    if (wasPlaying) {
      this.play();
    }
  }

  /**
   * Get current speed multiplier
   */
  getSpeed(): number {
    return this.speed;
  }

  /**
   * Reset to initial state
   * Clears history and stops playback
   */
  reset(): void {
    // Stop playback
    this.pause();

    // Reset to initial state (safe to assign directly - frozen by Immer)
    this.currentState = this.initialState;
    this.history = [this.initialState];
    this.currentHistoryIndex = 0;
    
    // Clear forecast cache
    this.forecastCache = null;
    
    // Clear view model cache
    this.viewModelCache = null;
  }

  // ===== Instructions Management Methods =====

  /**
   * Select a character for editing instructions
   * If characterId is null, clears selection
   * If same characterId is selected, toggles (deselects)
   */
  selectCharacter(characterId: string | null): void {
    if (characterId === null) {
      this.instructionsState.selectedCharacterId = null;
      return;
    }

    // Toggle if same character selected
    if (this.instructionsState.selectedCharacterId === characterId) {
      this.instructionsState.selectedCharacterId = null;
    } else {
      this.instructionsState.selectedCharacterId = characterId;
    }
  }

  /**
   * Get the currently selected character from combat state
   * Returns null if no selection or character not found
   */
  getSelectedCharacter(): Character | null {
    if (this.instructionsState.selectedCharacterId === null) {
      return null;
    }

    // Search players first, then enemies
    const character = this.currentState.players.find(
      p => p.id === this.instructionsState.selectedCharacterId
    ) || this.currentState.enemies.find(
      e => e.id === this.instructionsState.selectedCharacterId
    );

    return character || null;
  }

  /**
   * Get instructions for the currently selected character
   * Returns null if no selection
   */
  getSelectedCharacterInstructions(): CharacterInstructions | null {
    if (this.instructionsState.selectedCharacterId === null) {
      return null;
    }

    return this.instructionsState.instructions.get(
      this.instructionsState.selectedCharacterId
    ) || null;
  }

  /**
   * Update control mode for a character
   * No-op if character doesn't exist in instructions
   */
  updateControlMode(characterId: string, mode: 'human' | 'ai'): void {
    const instructions = this.instructionsState.instructions.get(characterId);
    if (!instructions) {
      return; // No-op for unknown character
    }

    instructions.controlMode = mode;
    this.instructionsState.isDirty = true;
  }

  /**
   * Reorder a skill instruction to a new priority index
   */
  updateSkillPriority(characterId: string, skillId: string, newIndex: number): void {
    const instructions = this.instructionsState.instructions.get(characterId);
    if (!instructions) {
      return;
    }

    const skillInstructions = instructions.skillInstructions;
    const currentIndex = skillInstructions.findIndex(si => si.skillId === skillId);

    if (currentIndex === -1) {
      return;
    }

    // Remove from current position
    const [removed] = skillInstructions.splice(currentIndex, 1);

    // Insert at new position
    skillInstructions.splice(newIndex, 0, removed!);

    this.instructionsState.isDirty = true;
  }

  /**
   * Toggle enabled state of a skill instruction
   */
  toggleSkillEnabled(characterId: string, skillId: string): void {
    const instructions = this.instructionsState.instructions.get(characterId);
    if (!instructions) {
      return;
    }

    const skillInstruction = instructions.skillInstructions.find(
      si => si.skillId === skillId
    );

    if (skillInstruction) {
      skillInstruction.enabled = !skillInstruction.enabled;
      this.instructionsState.isDirty = true;
    }
  }

  /**
   * Add a condition to a skill instruction
   */
  addCondition(characterId: string, skillId: string, condition: Condition): void {
    const instructions = this.instructionsState.instructions.get(characterId);
    if (!instructions) {
      return;
    }

    const skillInstruction = instructions.skillInstructions.find(
      si => si.skillId === skillId
    );

    if (skillInstruction) {
      skillInstruction.conditions.push(condition);
      this.instructionsState.isDirty = true;
    }
  }

  /**
   * Remove a condition from a skill instruction by index
   */
  removeCondition(characterId: string, skillId: string, conditionIndex: number): void {
    const instructions = this.instructionsState.instructions.get(characterId);
    if (!instructions) {
      return;
    }

    const skillInstruction = instructions.skillInstructions.find(
      si => si.skillId === skillId
    );

    if (skillInstruction && conditionIndex >= 0 && conditionIndex < skillInstruction.conditions.length) {
      skillInstruction.conditions.splice(conditionIndex, 1);
      this.instructionsState.isDirty = true;
    }
  }

  /**
   * Update targeting override for a skill instruction
   * Pass undefined to clear the override
   */
  updateTargetingOverride(
    characterId: string,
    skillId: string,
    targeting?: TargetingMode
  ): void {
    const instructions = this.instructionsState.instructions.get(characterId);
    if (!instructions) {
      return;
    }

    const skillInstruction = instructions.skillInstructions.find(
      si => si.skillId === skillId
    );

    if (skillInstruction) {
      skillInstruction.targetingOverride = targeting;
      this.instructionsState.isDirty = true;
    }
  }

  /**
   * Set which skill is currently being edited
   */
  setEditingSkill(skillId: string | null): void {
    this.instructionsState.editingSkillId = skillId;
  }

  /**
   * Get the currently editing skill ID
   */
  getEditingSkillId(): string | null {
    return this.instructionsState.editingSkillId;
  }

  /**
   * Apply instructions to characters in combat state
   * Converts SkillInstructions to Rules and updates character skills
   */
  applyInstructions(): void {
    const updatedPlayers = this.currentState.players.map(player => {
      const instructions = this.instructionsState.instructions.get(player.id);
      if (instructions) {
        return applyInstructionsToCharacter(player, instructions);
      }
      return player;
    });

    // Update current state with modified players
    this.currentState = deepClone(this.currentState);
    this.currentState.players = updatedPlayers;

    // Update history at current index
    this.history[this.currentHistoryIndex] = this.currentState;

    // Save applied state for discard functionality
    this.appliedInstructions = new Map(
      Array.from(this.instructionsState.instructions.entries()).map(([id, inst]) => [
        id,
        JSON.parse(JSON.stringify(inst)) // Deep clone
      ])
    );

    this.instructionsState.isDirty = false;
    
    // Invalidate forecast cache since instructions changed
    this.forecastCache = null;
    
    // Invalidate view model cache since instructions changed
    this.viewModelCache = null;
  }

  /**
   * Discard unapplied changes to instructions
   * Reverts to last applied state
   */
  discardChanges(): void {
    // Restore from last applied state
    this.instructionsState.instructions = new Map(
      Array.from(this.appliedInstructions.entries()).map(([id, inst]) => [
        id,
        JSON.parse(JSON.stringify(inst)) // Deep clone
      ])
    );

    this.instructionsState.isDirty = false;
  }

  /**
   * Get current instructions state
   */
  getInstructionsState(): InstructionsBuilderState {
    return this.instructionsState;
  }

  /**
   * Check if there are unsaved instruction changes
   */
  isDirty(): boolean {
    return this.instructionsState.isDirty;
  }

  /**
   * Get action forecast for current state
   * Returns cached forecast if state hasn't changed
   */
  getForecast(): ActionForecast {
    if (this.forecastCache === null) {
      this.forecastCache = forecastNextActions(
        this.currentState,
        this.instructionsState.instructions
      );
    }
    return this.forecastCache;
  }

  /**
   * Get presentation-ready view model for current state
   * Returns cached view model if state hasn't changed
   */
  getViewModel(): BattleViewModel {
    if (this.viewModelCache === null) {
      this.viewModelCache = ViewModelFactory.createBattleViewModel(this.currentState);
    }
    return this.viewModelCache;
  }
}
