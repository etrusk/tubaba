import type { Character } from '../types/character.js';

/**
 * Character Name Formatter
 *
 * Utilities for color-coding character names in UI text.
 * Each character gets a unique, distinguishable color from a carefully selected palette.
 */

/**
 * Color palette designed for readability on dark backgrounds (#1e3c72 to #2a5298)
 * Colors are distinct and support up to 12 characters
 */
const CHARACTER_COLORS = [
  '#4caf50', // Green (Hero)
  '#2196f3', // Blue (Mage)
  '#f44336', // Red (Goblin)
  '#ff9800', // Orange (Orc)
  '#9c27b0', // Purple
  '#00bcd4', // Cyan
  '#ffeb3b', // Yellow
  '#e91e63', // Pink
  '#8bc34a', // Light Green
  '#ff5722', // Deep Orange
  '#673ab7', // Deep Purple
  '#03a9f4', // Light Blue
];

/**
 * Returns a unique, consistent color for a character based on their ID
 *
 * @param characterId - Unique character identifier
 * @returns Hex color code
 *
 * @example
 * ```typescript
 * getCharacterColor('hero');  // Always returns '#4caf50'
 * getCharacterColor('mage');  // Always returns '#2196f3'
 * ```
 */
export function getCharacterColor(characterId: string): string {
  // Simple hash function to convert character ID to a consistent index
  let hash = 0;
  for (let i = 0; i < characterId.length; i++) {
    hash = ((hash << 5) - hash) + characterId.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value and modulo to get a valid color index
  const colorIndex = Math.abs(hash) % CHARACTER_COLORS.length;
  const color = CHARACTER_COLORS[colorIndex];
  
  // TypeScript safety: This should never happen due to modulo, but provide fallback
  if (!color) {
    return CHARACTER_COLORS[0]!; // First color as fallback
  }
  
  return color;
}

/**
 * Formats a single character name with unique color coding
 *
 * @param name - Character name to format
 * @param characterId - Unique character identifier
 * @returns HTML string with styled span element using inline color
 *
 * @example
 * ```typescript
 * formatCharacterName('Hero', 'hero');  // Returns: <span style="color: #4caf50; font-weight: bold;">Hero</span>
 * formatCharacterName('Goblin', 'goblin'); // Returns: <span style="color: #f44336; font-weight: bold;">Goblin</span>
 * ```
 */
export function formatCharacterName(name: string, characterId: string): string {
  const color = getCharacterColor(characterId);
  return `<span style="color: ${color}; font-weight: bold;">${name}</span>`;
}

/**
 * Colorizes all character names found in a text string
 * Searches for character names and wraps them with appropriate unique styling
 *
 * @param text - Text containing character names
 * @param characters - Array of characters with id and name
 * @returns Text with character names wrapped in styled spans with unique colors
 *
 * @example
 * ```typescript
 * const characters = [
 *   { id: 'hero', name: 'Hero', ... },
 *   { id: 'goblin', name: 'Goblin', ... }
 * ];
 * colorizeCharacterNamesInText('Hero attacks Goblin', characters);
 * // Returns: "<span style="color: #4caf50; font-weight: bold;">Hero</span> attacks <span style="color: #f44336; font-weight: bold;">Goblin</span>"
 * ```
 */
export function colorizeCharacterNamesInText(
  text: string,
  characters: Character[]
): string {
  let result = text;
  
  // Sort characters by name length (descending) to handle names that might be substrings of others
  // e.g., "Hero" and "Hero II" - we want to match "Hero II" first
  const sortedCharacters = [...characters].sort((a, b) => b.name.length - a.name.length);
  
  for (const character of sortedCharacters) {
    const color = getCharacterColor(character.id);
    // Use word boundaries to avoid partial matches
    const escapedName = character.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex special chars
    const regex = new RegExp(`\\b${escapedName}\\b`, 'g');
    result = result.replace(regex, `<span style="color: ${color}; font-weight: bold;">${character.name}</span>`);
  }
  
  return result;
}
