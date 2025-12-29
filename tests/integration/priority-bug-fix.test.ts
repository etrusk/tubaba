import { describe, it, expect } from 'vitest';
import { BattleController } from '../../src/ui/battle-controller.js';
import type { CombatState, Character } from '../../src/types/index.js';
import type { Skill } from '../../src/types/skill.js';

/**
 * Integration test to verify the bug fix:
 * Instructions priorities should be used by action selection, not hardcoded skill.rules
 * 
 * Bug: Shield has higher priority than Strike in UI but Strike is still selected
 * Root Cause: selectAction() only looked at skill.rules, not CharacterInstructions
 * Fix: selectAction() now accepts and uses CharacterInstructions when provided
 */
describe('Bug Fix: Instructions Priorities Used by Action Selection', () => {
  it('should select Shield when it has higher priority than Strike', () => {
    // Create skills with default priorities
    const strike: Skill = {
      id: 'strike',
      name: 'Strike',
      targeting: 'nearest-enemy',
      baseDuration: 2,
      effects: [{ type: 'damage', value: 10 }],
      rules: [{ priority: 10, conditions: [] }] // Default priority
    };

    const shield: Skill = {
      id: 'shield',
      name: 'Shield',
      targeting: 'self',
      baseDuration: 1,
      effects: [{ type: 'shield', value: 15 }],
      rules: [{ priority: 10, conditions: [] }] // Default priority (same as strike)
    };

    const player: Character = {
      id: 'player-1',
      name: 'Hero',
      isPlayer: true,
      maxHp: 100,
      currentHp: 100,
      skills: [strike, shield],
      statusEffects: [],
      currentAction: null
    };

    const enemy: Character = {
      id: 'enemy-1',
      name: 'Goblin',
      isPlayer: false,
      maxHp: 50,
      currentHp: 50,
      skills: [strike],
      statusEffects: [],
      currentAction: null
    };

    const initialState: CombatState = {
      players: [player],
      enemies: [enemy],
      tickNumber: 0,
      actionQueue: [],
      eventLog: [],
      battleStatus: 'ongoing'
    };

    const controller = new BattleController(initialState);

    // Get player instructions directly (no need to select character for this test)
    const playerInstructions = controller.getInstructionsState().instructions.get('player-1');
    if (playerInstructions) {
      const shieldInstruction = playerInstructions.skillInstructions.find(si => si.skillId === 'shield');
      const strikeInstruction = playerInstructions.skillInstructions.find(si => si.skillId === 'strike');
      
      if (shieldInstruction && strikeInstruction) {
        shieldInstruction.priority = 20; // Higher priority
        strikeInstruction.priority = 10; // Lower priority
      }
    }

    // Get forecast BEFORE applying (this should now show Shield)
    const forecast = controller.getForecast();
    const playerForecast = forecast.characterForecasts.find(cf => cf.characterId === 'player-1');
    
    expect(playerForecast).toBeDefined();
    expect(playerForecast?.nextAction).toBeDefined();
    expect(playerForecast?.nextAction?.skillName).toBe('Shield');
    expect(playerForecast?.nextAction?.reason).toBe('Always');

    // Execute a tick - should queue Shield, not Strike
    controller.step();
    
    const state = controller.getCurrentState();
    const updatedPlayer = state.players.find(p => p.id === 'player-1');
    
    expect(updatedPlayer?.currentAction).toBeDefined();
    expect(updatedPlayer?.currentAction?.skillId).toBe('shield');
    expect(updatedPlayer?.currentAction?.targets).toEqual(['player-1']); // Shield targets self
  });

  it('should select Strike when it has higher priority than Shield', () => {
    const strike: Skill = {
      id: 'strike',
      name: 'Strike',
      targeting: 'nearest-enemy',
      baseDuration: 2,
      effects: [{ type: 'damage', value: 10 }],
      rules: [{ priority: 10, conditions: [] }]
    };

    const shield: Skill = {
      id: 'shield',
      name: 'Shield',
      targeting: 'self',
      baseDuration: 1,
      effects: [{ type: 'shield', value: 15 }],
      rules: [{ priority: 10, conditions: [] }]
    };

    const player: Character = {
      id: 'player-1',
      name: 'Hero',
      isPlayer: true,
      maxHp: 100,
      currentHp: 100,
      skills: [strike, shield],
      statusEffects: [],
      currentAction: null
    };

    const enemy: Character = {
      id: 'enemy-1',
      name: 'Goblin',
      isPlayer: false,
      maxHp: 50,
      currentHp: 50,
      skills: [strike],
      statusEffects: [],
      currentAction: null
    };

    const initialState: CombatState = {
      players: [player],
      enemies: [enemy],
      tickNumber: 0,
      actionQueue: [],
      eventLog: [],
      battleStatus: 'ongoing'
    };

    const controller = new BattleController(initialState);

    // Set Strike priority higher than Shield
    const playerInstructions = controller.getInstructionsState().instructions.get('player-1');
    if (playerInstructions) {
      const shieldInstruction = playerInstructions.skillInstructions.find(si => si.skillId === 'shield');
      const strikeInstruction = playerInstructions.skillInstructions.find(si => si.skillId === 'strike');
      
      if (shieldInstruction && strikeInstruction) {
        strikeInstruction.priority = 20; // Higher priority
        shieldInstruction.priority = 10; // Lower priority
      }
    }

    // Get forecast - should show Strike
    const forecast = controller.getForecast();
    const playerForecast = forecast.characterForecasts.find(cf => cf.characterId === 'player-1');
    
    expect(playerForecast?.nextAction?.skillName).toBe('Strike');

    // Execute a tick - should queue Strike, not Shield
    controller.step();
    
    const state = controller.getCurrentState();
    const updatedPlayer = state.players.find(p => p.id === 'player-1');
    
    expect(updatedPlayer?.currentAction?.skillId).toBe('strike');
    expect(updatedPlayer?.currentAction?.targets).toEqual(['enemy-1']);
  });

  it('should respect enabled flag in instructions', () => {
    const strike: Skill = {
      id: 'strike',
      name: 'Strike',
      targeting: 'nearest-enemy',
      baseDuration: 2,
      effects: [{ type: 'damage', value: 10 }],
      rules: [{ priority: 10, conditions: [] }]
    };

    const shield: Skill = {
      id: 'shield',
      name: 'Shield',
      targeting: 'self',
      baseDuration: 1,
      effects: [{ type: 'shield', value: 15 }],
      rules: [{ priority: 10, conditions: [] }]
    };

    const player: Character = {
      id: 'player-1',
      name: 'Hero',
      isPlayer: true,
      maxHp: 100,
      currentHp: 100,
      skills: [strike, shield],
      statusEffects: [],
      currentAction: null
    };

    const enemy: Character = {
      id: 'enemy-1',
      name: 'Goblin',
      isPlayer: false,
      maxHp: 50,
      currentHp: 50,
      skills: [strike],
      statusEffects: [],
      currentAction: null
    };

    const initialState: CombatState = {
      players: [player],
      enemies: [enemy],
      tickNumber: 0,
      actionQueue: [],
      eventLog: [],
      battleStatus: 'ongoing'
    };

    const controller = new BattleController(initialState);

    // Disable Strike (highest priority skill) and all other skills except Shield
    const playerInstructions = controller.getInstructionsState().instructions.get('player-1');
    if (playerInstructions) {
      // Disable all skills first
      for (const instruction of playerInstructions.skillInstructions) {
        instruction.enabled = false;
      }
      
      // Then configure only the skills we're testing
      const strikeInstruction = playerInstructions.skillInstructions.find(si => si.skillId === 'strike');
      const shieldInstruction = playerInstructions.skillInstructions.find(si => si.skillId === 'shield');
      
      if (strikeInstruction && shieldInstruction) {
        strikeInstruction.priority = 20; // Highest priority
        strikeInstruction.enabled = false; // But disabled!
        shieldInstruction.priority = 10;
        shieldInstruction.enabled = true; // Only skill enabled
      }
    }

    // Should select Shield because Strike is disabled
    const forecast = controller.getForecast();
    const playerForecast = forecast.characterForecasts.find(cf => cf.characterId === 'player-1');
    
    expect(playerForecast?.nextAction?.skillName).toBe('Shield');

    controller.step();
    const state = controller.getCurrentState();
    const updatedPlayer = state.players.find(p => p.id === 'player-1');
    
    expect(updatedPlayer?.currentAction?.skillId).toBe('shield');
  });
});
