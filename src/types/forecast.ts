/**
 * Action Forecast Type Definitions
 * 
 * Provides "see the future" visibility into upcoming actions and AI decision-making.
 * Used by ActionForecastAnalyzer to predict character behavior and by ActionForecastRenderer
 * to display timeline and rule summaries.
 */

/**
 * Complete forecast for all characters
 */
export interface ActionForecast {
  timeline: ActionTimelineEntry[];  // Next N actions in order
  characterForecasts: CharacterForecast[]; // Per-character details
}

/**
 * Single entry in the action timeline
 */
export interface ActionTimelineEntry {
  tickNumber: number;           // When this will happen
  characterId: string;
  characterName: string;
  skillName: string;
  targetNames: string[];
  isQueued: boolean;            // True if already in progress, false if predicted
}

/**
 * Forecast for a single character
 */
export interface CharacterForecast {
  characterId: string;
  characterName: string;
  isPlayer: boolean;
  currentAction: {
    skillName: string;
    targetNames: string[];
    ticksRemaining: number;
  } | null;
  nextAction: {
    skillName: string;
    targetNames: string[];
    reason: string;              // Which rule matched
  } | null;
  rulesSummary: RuleSummary[];
}

/**
 * Human-readable rule summary
 */
export interface RuleSummary {
  priority: number;
  skillName: string;
  tickCost: number;             // Skill's baseDuration (tick cost)
  conditionsText: string;       // "If HP < 50% AND Ally Count > 1"
  targetingMode: string;        // "Lowest HP Enemy"
  enabled: boolean;
}
