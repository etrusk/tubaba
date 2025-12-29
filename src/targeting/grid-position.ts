export interface GridPosition {
  x: number;
  y: number;
}

export function manhattanDistance(a: GridPosition, b: GridPosition): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function euclideanDistance(a: GridPosition, b: GridPosition): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function findNearest(
  from: GridPosition,
  candidates: GridPosition[]
): GridPosition | null {
  if (candidates.length === 0) {
    return null;
  }

  let nearest = candidates[0]!;
  let minDistance = euclideanDistance(from, nearest);

  for (let i = 1; i < candidates.length; i++) {
    const candidate = candidates[i]!;
    const distance = euclideanDistance(from, candidate);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = candidate;
    }
  }

  return nearest;
}
