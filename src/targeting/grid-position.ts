export interface GridPosition {
  x: number;
  y: number;
}

export function euclideanDistance(a: GridPosition, b: GridPosition): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
