/**
 * Generates a noisy loop with random variations around a circular boundary.
 * This function creates natural-looking irregular shapes like lakes or terrain boundaries.
 *
 * @param centerX - The X coordinate of the loop's center
 * @param centerY - The Y coordinate of the loop's center
 * @param baseRadius - The base radius of the loop before noise is applied
 * @param noiseScale - Scale factor for the noise (0.0 to 1.0, defaults to 0.5)
 * @param numPoints - Number of points to generate around the loop (defaults to 60)
 * @returns Array of [x, y] coordinate pairs forming a closed loop
 */
export const generateNoisyLoop = (
  centerX: number,
  centerY: number,
  baseRadius: number,
  noiseScale: number = 0.5,
  numPoints: number = 60
): [number, number][] => {
  const points: [number, number][] = [];

  for (let i = 0; i < numPoints; i++) {
    const theta = (i / numPoints) * Math.PI * 2;

    // Generate noise using sine/cosine waves with random variation
    const noise =
      Math.sin(theta * 5) * baseRadius * 0.15 * noiseScale +
      Math.cos(theta * 3) * baseRadius * 0.1 * noiseScale +
      (Math.random() - 0.5) * baseRadius * 0.1 * noiseScale;

    const x = centerX + Math.cos(theta) * (baseRadius + noise);
    const y = centerY + Math.sin(theta) * (baseRadius + noise);
    points.push([x, y]);
  }

  // Close the loop by adding the first point at the end
  if (points.length > 0) {
    points.push([...points[0]]);
  }

  return points;
};

/**
 * Generates a noisy boundary loop for the game board with complex area constraints.
 * This is a specialized version for the main game boundary that includes bounds checking
 * and complex noise patterns to create a more interesting game area.
 *
 * @param width - The width of the game board
 * @param height - The height of the game board
 * @param numPoints - Number of points to generate around the loop (defaults to 120)
 * @param areaRatio - Ratio of the loop area to the total board area (defaults to 0.65)
 * @param verticalSpacing - Minimum vertical spacing from edges
 * @param horizontalSpacing - Minimum horizontal spacing from edges
 * @returns Array of [x, y] coordinate pairs forming a closed loop
 */
export const generateGameBoundaryLoop = (
  width: number,
  height: number,
  numPoints: number = 120,
  areaRatio: number = 0.65,
  verticalSpacing: number = 10,
  horizontalSpacing: number = 35
): [number, number][] => {
  const cx = width / 2;
  const cy = height / 2 - verticalSpacing * 10;
  const targetArea = width * height * areaRatio;
  const maxRadiusX = Math.min(cx, width - cx - horizontalSpacing);
  const maxRadiusY = Math.min(cy, height - cy - verticalSpacing);
  const baseRadius = Math.min(
    Math.sqrt(targetArea / Math.PI),
    maxRadiusX * 0.98,
    maxRadiusY * 0.98
  );

  const points: [number, number][] = [];
  for (let i = 0; i < numPoints; i++) {
    const theta = (i / numPoints) * Math.PI * 2;
    const noise =
      Math.sin(theta * 7) * baseRadius * 0.1 +
      Math.cos(theta * 4) * baseRadius * 0.1 +
      (Math.random() - 1.2) * baseRadius * 0.05;
    let x =
      cx +
      Math.cos(theta) * (baseRadius + noise) * (1 + 0.25 * Math.sin(theta));
    let y =
      cy +
      Math.sin(theta) *
        (baseRadius + noise) *
        (1 + 0.45 * Math.cos(theta - 0.5));
    x = Math.max(horizontalSpacing, Math.min(width - horizontalSpacing, x));
    y = Math.max(verticalSpacing, Math.min(height - verticalSpacing, y));
    points.push([x, y]);
  }
  if (points.length > 0) {
    points.push([...points[0]]);
  }
  return points;
};

/**
 * Generates a noisy line representing a river with natural curves and variations.
 *
 * @param startX - Starting X coordinate
 * @param startY - Starting Y coordinate
 * @param endX - Ending X coordinate
 * @param endY - Ending Y coordinate
 * @param numPoints - Number of points to generate along the river (defaults to 20)
 * @param noiseScale - Scale factor for the noise (defaults to 0.3)
 * @returns Array of [x, y] coordinate pairs forming the river path
 */
export const generateNoisyRiver = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  numPoints: number = 50,
  noiseScale: number = 0.7
): [number, number][] => {
  const points: [number, number][] = [];
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.sqrt(dx * dx + dy * dy);

  // Calculate perpendicular direction for noise
  const perpX = -dy / length;
  const perpY = dx / length;

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;

    // Linear interpolation between start and end
    let x = startX + dx * t;
    let y = startY + dy * t;

    // Add noise perpendicular to the river direction
    // Use sine waves and random variation for natural curves
    if (i > 0 && i < numPoints) {
      // Don't add noise to endpoints
      const noiseAmount = Math.sin(t * Math.PI) * length * noiseScale * 0.1; // Peak noise in middle
      const waveNoise = Math.sin(t * Math.PI * 4) * noiseAmount * 0.7;
      const randomNoise = (Math.random() - 0.5) * noiseAmount * 0.5;
      const totalNoise = waveNoise + randomNoise;

      x += perpX * totalNoise;
      y += perpY * totalNoise;
    }

    points.push([x, y]);
  }

  return points;
};

/**
 * Checks if two line segments intersect.
 * 
 * @param line1Start - Start point of first line segment
 * @param line1End - End point of first line segment  
 * @param line2Start - Start point of second line segment
 * @param line2End - End point of second line segment
 * @returns True if the line segments intersect, false otherwise
 */
export const doLinesIntersect = (
  line1Start: [number, number],
  line1End: [number, number],
  line2Start: [number, number],
  line2End: [number, number]
): boolean => {
  const [x1, y1] = line1Start;
  const [x2, y2] = line1End;
  const [x3, y3] = line2Start;
  const [x4, y4] = line2End;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-10) return false; // Lines are parallel

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
};

/**
 * Checks if a polyline (series of connected line segments) intersects with another polyline.
 * 
 * @param polyline1 - First polyline as array of points
 * @param polyline2 - Second polyline as array of points
 * @param allowEndpointConnections - If true, allows connections at endpoints
 * @returns True if the polylines intersect, false otherwise
 */
export const doPolylinesIntersect = (
  polyline1: [number, number][],
  polyline2: [number, number][],
  allowEndpointConnections: boolean = true
): boolean => {
  for (let i = 0; i < polyline1.length - 1; i++) {
    for (let j = 0; j < polyline2.length - 1; j++) {
      const line1Start = polyline1[i];
      const line1End = polyline1[i + 1];
      const line2Start = polyline2[j];
      const line2End = polyline2[j + 1];

      if (doLinesIntersect(line1Start, line1End, line2Start, line2End)) {
        // If allowing endpoint connections, check if this is just an endpoint connection
        if (allowEndpointConnections) {
          const isEndpointConnection = 
            (i === 0 && (j === 0 || j === polyline2.length - 2)) || // Start of poly1 connects to start/end of poly2
            (i === polyline1.length - 2 && (j === 0 || j === polyline2.length - 2)); // End of poly1 connects to start/end of poly2
          
          if (!isEndpointConnection) {
            return true; // This is a crossing, not just an endpoint connection
          }
        } else {
          return true; // Any intersection counts
        }
      }
    }
  }
  return false;
};

/**
 * Gets the minimum distance between a point and a polyline.
 * 
 * @param point - The point to measure from
 * @param polyline - The polyline to measure to
 * @returns The minimum distance
 */
export const getMinDistanceToPolyline = (
  point: [number, number],
  polyline: [number, number][]
): number => {
  let minDistance = Infinity;
  const [px, py] = point;

  for (let i = 0; i < polyline.length - 1; i++) {
    const [x1, y1] = polyline[i];
    const [x2, y2] = polyline[i + 1];

    // Calculate distance from point to line segment
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    const distance = Math.sqrt(dx * dx + dy * dy);
    minDistance = Math.min(minDistance, distance);
  }

  return minDistance;
};

/**
 * Gets the minimum distance between a line segment and a point.
 * 
 * @param lineStart - Start point of the line segment
 * @param lineEnd - End point of the line segment
 * @param point - The point to measure to
 * @returns The minimum distance from the line segment to the point
 */
export const getDistanceFromLineToPoint = (
  lineStart: [number, number],
  lineEnd: [number, number],
  point: [number, number]
): number => {
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;
  const [px, py] = point;

  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Checks if a polyline intersects with any circular areas (like mileposts).
 * 
 * @param polyline - The polyline to check
 * @param circles - Array of circles with x, y coordinates and radius
 * @returns True if the polyline intersects any circle, false otherwise
 */
export const doesPolylineIntersectCircles = (
  polyline: [number, number][],
  circles: { x: number; y: number; radius: number }[]
): boolean => {
  for (const circle of circles) {
    for (let i = 0; i < polyline.length - 1; i++) {
      const distance = getDistanceFromLineToPoint(
        polyline[i],
        polyline[i + 1],
        [circle.x, circle.y]
      );
      if (distance < circle.radius) {
        return true;
      }
    }
  }
  return false;
};
