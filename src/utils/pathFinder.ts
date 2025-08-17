import { doesPolylineIntersectCircles } from "./generateNoisyLoop";

export const getTempEndpointFromPerpendicularLine = (
  currentPoint: [number, number],
  actualEndPoint: [number, number],
  nextMilepostToAvoid: [number, number],
  milepostRadius: number
): [number, number] => {
  const milepostCircle = [
    {
      x: nextMilepostToAvoid[0],
      y: nextMilepostToAvoid[1],
      radius: milepostRadius,
    },
  ];
  // Calculate a perpendicular line at actualEndPoint (forms a "T" shape)
  const dx = actualEndPoint[0] - currentPoint[0];
  const dy = actualEndPoint[1] - currentPoint[1];
  // Perpendicular direction for finding a new temporary endpoint
  // This will create a line that is perpendicular to the line from currentPoint to actualEndPoint
  const perpLength = 20; // Length of the perpendicular line (adjust as needed)
  const perpDir = Math.random() < 0.5 ? [-dy, dx] : [dy, -dx]; // Randomly choose a direction to move around obstacles
  const norm = Math.sqrt(perpDir[0] * perpDir[0] + perpDir[1] * perpDir[1]);
  const perpUnit = norm === 0 ? [0, 0] : [perpDir[0] / norm, perpDir[1] / norm];
  const perpStart: [number, number] = [
    actualEndPoint[0] - (perpUnit[0] * perpLength) / 2,
    actualEndPoint[1] - (perpUnit[1] * perpLength) / 2,
  ];
  const perpEnd: [number, number] = [
    actualEndPoint[0] + (perpUnit[0] * perpLength) / 2,
    actualEndPoint[1] + (perpUnit[1] * perpLength) / 2,
  ];

  // Helper function to get a random point on the perpendicular line
  const getRandomPointOnLine = (
    start: [number, number],
    end: [number, number]
  ): [number, number] => {
    const t = Math.random(); // Random parameter between 0 and 1
    return [
      start[0] + t * (end[0] - start[0]),
      start[1] + t * (end[1] - start[1]),
    ];
  };

  // Try to find a valid temp endpoint on the perpendicular line
  const maxAttempts = 20; // Prevent infinite loops
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Get a random point on the perpendicular line
    const tempEndpoint = getRandomPointOnLine(perpStart, perpEnd);

    // Check if the line from currentPoint to tempEndpoint collides with the milepost circle
    if (
      !doesPolylineIntersectCircles(
        [currentPoint, tempEndpoint],
        milepostCircle
      )
    ) {
      // Found a valid temp endpoint
      return tempEndpoint;
    }
  }

  // Fallback: if no safe point found after max attempts, return the furthest point from the milepost
  const distanceToMilepostFromStart = Math.sqrt(
    Math.pow(perpStart[0] - nextMilepostToAvoid[0], 2) +
      Math.pow(perpStart[1] - nextMilepostToAvoid[1], 2)
  );
  const distanceToMilepostFromEnd = Math.sqrt(
    Math.pow(perpEnd[0] - nextMilepostToAvoid[0], 2) +
      Math.pow(perpEnd[1] - nextMilepostToAvoid[1], 2)
  );

  return distanceToMilepostFromStart > distanceToMilepostFromEnd
    ? perpStart
    : perpEnd;
};

// Helper function to get direction from point toward boundary
export const getDirectionToBoundary = (
  x: number,
  y: number,
  boundaryPoints: [number, number][]
): [number, number] => {
  // Calculate boundary bounding box to find center
  const boundingBox = boundaryPoints.reduce(
    (acc, point) => ({
      minX: Math.min(acc.minX, point[0]),
      maxX: Math.max(acc.maxX, point[0]),
      minY: Math.min(acc.minY, point[1]),
      maxY: Math.max(acc.maxY, point[1]),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  );

  const centerX = (boundingBox.minX + boundingBox.maxX) / 2;
  const centerY = (boundingBox.minY + boundingBox.maxY) / 2;

  // Calculate direction away from center toward nearest boundary
  const dx = x - centerX;
  const dy = y - centerY;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) {
    // Point is at center, choose random direction
    const angle = Math.random() * 2 * Math.PI;
    return [Math.cos(angle), Math.sin(angle)];
  }

  return [dx / length, dy / length];
};

// Helper function to get line intersection point
export const getLineIntersection = (
  line1Start: [number, number],
  line1End: [number, number],
  line2Start: [number, number],
  line2End: [number, number]
): [number, number] | null => {
  const [x1, y1] = line1Start;
  const [x2, y2] = line1End;
  const [x3, y3] = line2Start;
  const [x4, y4] = line2End;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-10) return null; // Lines are parallel

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
  }
  return null;
};

// Helper function to find intersection point with existing rivers, lakes, or mileposts
export const findClosestIntersectionTarget = (
  startPoint: [number, number],
  direction: [number, number],
  rivers: [number, number][][],
  lakes: [number, number][][],
  milepostCoords: [number, number][],
  boundaryPoints: [number, number][]
): [number, number] | null => {
  // Cast a ray from start point in the given direction and find first intersection
  // Calculate max extent of boundary for ray length
  const boundingBox = boundaryPoints.reduce(
    (acc, point) => ({
      minX: Math.min(acc.minX, point[0]),
      maxX: Math.max(acc.maxX, point[0]),
      minY: Math.min(acc.minY, point[1]),
      maxY: Math.max(acc.maxY, point[1]),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  );
  const rayLength = Math.max(
    boundingBox.maxX - boundingBox.minX,
    boundingBox.maxY - boundingBox.minY
  ); // Long enough to reach boundary
  const endPoint: [number, number] = [
    startPoint[0] + direction[0] * rayLength,
    startPoint[1] + direction[1] * rayLength,
  ];

  let closestIntersection: [number, number] | null = null;
  let closestDistance = Infinity;

  // Check intersections with existing rivers
  for (const river of rivers) {
    for (let i = 0; i < river.length - 1; i++) {
      const intersection = getLineIntersection(
        startPoint,
        endPoint,
        river[i],
        river[i + 1]
      );
      if (intersection) {
        const distance = Math.sqrt(
          Math.pow(intersection[0] - startPoint[0], 2) +
            Math.pow(intersection[1] - startPoint[1], 2)
        );
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIntersection = intersection;
        }
      }
    }
  }

  // Check intersections with lakes
  for (const lake of lakes) {
    for (let i = 0; i < lake.length - 1; i++) {
      const intersection = getLineIntersection(
        startPoint,
        endPoint,
        lake[i],
        lake[i + 1]
      );
      if (intersection) {
        const distance = Math.sqrt(
          Math.pow(intersection[0] - startPoint[0], 2) +
            Math.pow(intersection[1] - startPoint[1], 2)
        );
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIntersection = intersection;
        }
      }
    }
  }

  // Check intersections with mileposts
  for (const milepost of milepostCoords) {
    const intersection = getLineIntersection(
      startPoint,
      endPoint,
      milepost,
      [milepost[0] + 1, milepost[1]] // Extend line to the right for intersection check
    );
    if (intersection) {
      const distance = Math.sqrt(
        Math.pow(intersection[0] - startPoint[0], 2) +
          Math.pow(intersection[1] - startPoint[1], 2)
      );
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIntersection = intersection;
      }
    }
  }

  // Check if we hit the boundary
  const boundaryIntersection = getLineIntersection(
    startPoint,
    endPoint,
    boundaryPoints[0],
    boundaryPoints[boundaryPoints.length - 1]
  );
  if (boundaryIntersection) {
    const distance = Math.sqrt(
      Math.pow(boundaryIntersection[0] - startPoint[0], 2) +
        Math.pow(boundaryIntersection[1] - startPoint[1], 2)
    );
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIntersection = boundaryIntersection;
    }
  }

  // If no intersection found, return null
  if (!closestIntersection) {
    return null;
  }

  // Return the closest intersection point found
  closestIntersection[0] = Math.round(closestIntersection[0] * 100) / 100; // Round to avoid floating point issues
  closestIntersection[1] = Math.round(closestIntersection[1] * 100) / 100;

  // Debug logging
  console.log(
    `Found intersection at (${closestIntersection[0]}, ${closestIntersection[1]})`
  );

  // Ensure the intersection point is within the boundary
  if (
    closestIntersection[0] < boundingBox.minX ||
    closestIntersection[0] > boundingBox.maxX ||
    closestIntersection[1] < boundingBox.minY ||
    closestIntersection[1] > boundingBox.maxY
  ) {
    console.warn(
      `Intersection point (${closestIntersection[0]}, ${closestIntersection[1]}) is outside boundary`
    );
    return null;
  }

  return closestIntersection;
};

// Helper function to find a random point on lake edge
export const getRandomLakeEdgePoint = (
  lake: [number, number][]
): [number, number] => {
  const randomIndex = Math.floor(Math.random() * (lake.length - 1)); // -1 to avoid duplicate closing point
  return lake[randomIndex];
};

// Helper function to find closest point on boundary
export const getClosestBoundaryPoint = (
  x: number,
  y: number,
  boundaryPoints: [number, number][]
): [number, number] => {
  let closestPoint = boundaryPoints[0];
  let minDistance = Infinity;

  for (const point of boundaryPoints) {
    const dx = point[0] - x;
    const dy = point[1] - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < minDistance) {
      minDistance = distance;
      closestPoint = point;
    }
  }
  return closestPoint;
};

// Helper function to get direction away from lake edge (perpendicular to tangent, away from lake interior)
export const getDirectionAwayFromLakeEdge = (
  edgePoint: [number, number],
  lake: [number, number][],
  tolerance: number = 3
): [number, number] | null => {
  // Find the closest edge segment to the given point
  let closestSegmentIndex = -1;
  let minDistanceToSegment = Infinity;
  
  for (let i = 0; i < lake.length; i++) {
    const j = (i + 1) % lake.length;
    const segmentStart = lake[i];
    const segmentEnd = lake[j];
    
    // Calculate distance from edge point to this line segment
    const A = edgePoint[0] - segmentStart[0];
    const B = edgePoint[1] - segmentStart[1];
    const C = segmentEnd[0] - segmentStart[0];
    const D = segmentEnd[1] - segmentStart[1];
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;
    
    let xx, yy;
    if (param < 0) {
      xx = segmentStart[0];
      yy = segmentStart[1];
    } else if (param > 1) {
      xx = segmentEnd[0];
      yy = segmentEnd[1];
    } else {
      xx = segmentStart[0] + param * C;
      yy = segmentStart[1] + param * D;
    }
    
    const distance = Math.sqrt(
      Math.pow(edgePoint[0] - xx, 2) + Math.pow(edgePoint[1] - yy, 2)
    );
    
    if (distance < minDistanceToSegment && distance <= tolerance) {
      minDistanceToSegment = distance;
      closestSegmentIndex = i;
    }
  }
  
  if (closestSegmentIndex === -1) {
    return null; // Point is not on lake edge
  }
  
  // Get the tangent direction of the closest edge segment
  const segmentStart = lake[closestSegmentIndex];
  const segmentEnd = lake[(closestSegmentIndex + 1) % lake.length];
  
  const segmentDx = segmentEnd[0] - segmentStart[0];
  const segmentDy = segmentEnd[1] - segmentStart[1];
  const segmentLength = Math.sqrt(segmentDx * segmentDx + segmentDy * segmentDy);
  
  if (segmentLength === 0) {
    return null; // Degenerate segment
  }
  
  // Normalize the tangent direction
  const tangentDirection: [number, number] = [segmentDx / segmentLength, segmentDy / segmentLength];
  
  // Calculate the two perpendicular directions to the tangent
  const perp1: [number, number] = [-tangentDirection[1], tangentDirection[0]];
  const perp2: [number, number] = [tangentDirection[1], -tangentDirection[0]];
  
  // Calculate lake center to determine which perpendicular direction points away
  const lakeCenter = lake.reduce(
    (acc, point) => [acc[0] + point[0], acc[1] + point[1]],
    [0, 0] as [number, number]
  ).map(coord => coord / lake.length) as [number, number];
  
  // Test which perpendicular direction points away from the lake center
  const testPoint1: [number, number] = [
    edgePoint[0] + perp1[0] * 10,
    edgePoint[1] + perp1[1] * 10
  ];
  const testPoint2: [number, number] = [
    edgePoint[0] + perp2[0] * 10,
    edgePoint[1] + perp2[1] * 10
  ];
  
  const distToCenter1 = Math.sqrt(
    Math.pow(testPoint1[0] - lakeCenter[0], 2) + Math.pow(testPoint1[1] - lakeCenter[1], 2)
  );
  const distToCenter2 = Math.sqrt(
    Math.pow(testPoint2[0] - lakeCenter[0], 2) + Math.pow(testPoint2[1] - lakeCenter[1], 2)
  );
  
  // Return the direction that moves away from lake center
  return distToCenter1 > distToCenter2 ? perp1 : perp2;
};

// Helper function to check if a direction is in the valid hemisphere away from lake
export const isDirectionValidForLakeEdge = (
  edgePoint: [number, number],
  targetDirection: [number, number],
  lake: [number, number][]
): boolean => {
  const awayDirection = getDirectionAwayFromLakeEdge(edgePoint, lake);
  if (!awayDirection) return true; // If we can't determine away direction, allow it
  
  // Check if target direction has positive dot product with away direction
  // This means it's in the 180-degree arc away from the lake
  const dotProduct = awayDirection[0] * targetDirection[0] + awayDirection[1] * targetDirection[1];
  return dotProduct >= 0;
};

// Helper function to create smooth curves using quadratic Bézier curves
export const createSmoothCurve = (
  points: [number, number][],
  smoothness: number = 0.3
): [number, number][] => {
  if (points.length < 3) return points;
  
  const smoothedPoints: [number, number][] = [points[0]]; // Start with first point
  
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const current = points[i];
    const next = points[i + 1];
    
    // Calculate control points for smooth curve
    const prevToNext = [next[0] - prev[0], next[1] - prev[1]];
    const controlPoint1: [number, number] = [
      prev[0] + prevToNext[0] * smoothness,
      prev[1] + prevToNext[1] * smoothness
    ];
    const controlPoint2: [number, number] = [
      next[0] - prevToNext[0] * smoothness,
      next[1] - prevToNext[1] * smoothness
    ];
    
    // Generate curve points using quadratic Bézier
    const curvePoints = generateBezierCurve(prev, controlPoint1, current, 8);
    smoothedPoints.push(...curvePoints.slice(1)); // Skip first point to avoid duplicates
  }
  
  smoothedPoints.push(points[points.length - 1]); // Add final point
  return smoothedPoints;
};

// Helper function to generate quadratic Bézier curve points
export const generateBezierCurve = (
  start: [number, number],
  control: [number, number],
  end: [number, number],
  segments: number = 10
): [number, number][] => {
  const points: [number, number][] = [];
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = Math.pow(1 - t, 2) * start[0] + 2 * (1 - t) * t * control[0] + Math.pow(t, 2) * end[0];
    const y = Math.pow(1 - t, 2) * start[1] + 2 * (1 - t) * t * control[1] + Math.pow(t, 2) * end[1];
    points.push([x, y]);
  }
  
  return points;
};

// Helper function to generate cubic Bézier curve points for more complex curves
export const generateCubicBezierCurve = (
  start: [number, number],
  control1: [number, number],
  control2: [number, number],
  end: [number, number],
  segments: number = 15
): [number, number][] => {
  const points: [number, number][] = [];
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;
    
    const x = mt3 * start[0] + 3 * mt2 * t * control1[0] + 3 * mt * t2 * control2[0] + t3 * end[0];
    const y = mt3 * start[1] + 3 * mt2 * t * control1[1] + 3 * mt * t2 * control2[1] + t3 * end[1];
    points.push([x, y]);
  }
  
  return points;
};

// Helper function to add natural meandering to river points
export const addRiverMeandering = (
  points: [number, number][],
  meanderIntensity: number = 8,
  meanderFrequency: number = 0.3
): [number, number][] => {
  if (points.length < 2) return points;
  
  const meanderedPoints: [number, number][] = [points[0]];
  
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const current = points[i];
    
    // Calculate the direction vector
    const dx = current[0] - prev[0];
    const dy = current[1] - prev[1];
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length > 0) {
      // Normalize direction
      const normalizedDx = dx / length;
      const normalizedDy = dy / length;
      
      // Calculate perpendicular vector for meandering
      const perpX = -normalizedDy;
      const perpY = normalizedDx;
      
      // Apply sinusoidal meandering
      const progress = i / (points.length - 1);
      const meanderOffset = Math.sin(progress * Math.PI * 2 * meanderFrequency) * meanderIntensity;
      
      // Add meandering offset
      const meanderedPoint: [number, number] = [
        current[0] + perpX * meanderOffset,
        current[1] + perpY * meanderOffset
      ];
      
      meanderedPoints.push(meanderedPoint);
    } else {
      meanderedPoints.push(current);
    }
  }
  
  return meanderedPoints;
};

// Helper function to apply easing function for natural river flow
export const applyEasingToRiverSegment = (
  start: [number, number],
  end: [number, number],
  easingFunction: (t: number) => number = easeInOutCubic,
  segments: number = 12
): [number, number][] => {
  const points: [number, number][] = [];
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const easedT = easingFunction(t);
    
    const x = start[0] + (end[0] - start[0]) * easedT;
    const y = start[1] + (end[1] - start[1]) * easedT;
    points.push([x, y]);
  }
  
  return points;
};

// Easing functions for natural river curves
export const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export const easeInOutSine = (t: number): number => {
  return -(Math.cos(Math.PI * t) - 1) / 2;
};

export const easeInOutQuad = (t: number): number => {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};

// Helper function to create constrained smooth curves that respect collision boundaries
export const createConstrainedSmoothCurve = (
  points: [number, number][],
  smoothness: number = 0.2,
  constraintCheck: (point: [number, number]) => boolean
): [number, number][] => {
  if (points.length < 3) return points;
  
  const smoothedPoints: [number, number][] = [points[0]]; // Start with first point
  
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const current = points[i];
    const next = points[i + 1];
    
    // Calculate control points for smooth curve with reduced intensity
    const prevToNext = [next[0] - prev[0], next[1] - prev[1]];
    const controlPoint: [number, number] = [
      current[0] + prevToNext[0] * smoothness * 0.1,
      current[1] + prevToNext[1] * smoothness * 0.1
    ];
    
    // Generate small curve segment
    const curvePoints = generateBezierCurve(prev, controlPoint, next, 6);
    
    // Add points that pass constraint checks
    for (let j = 1; j < curvePoints.length - 1; j++) {
      const point = curvePoints[j];
      if (constraintCheck(point)) {
        smoothedPoints.push(point);
      } else {
        // Fall back to linear interpolation if curve violates constraints
        const fallbackPoint: [number, number] = [
          prev[0] + (next[0] - prev[0]) * (j / (curvePoints.length - 1)),
          prev[1] + (next[1] - prev[1]) * (j / (curvePoints.length - 1))
        ];
        smoothedPoints.push(fallbackPoint);
      }
    }
  }
  
  smoothedPoints.push(points[points.length - 1]); // Add final point
  return smoothedPoints;
};

// Helper function to reduce sharp angles in the path before smoothing
export const reduceSharpAngles = (
  points: [number, number][],
  angleThreshold: number = Math.PI * 0.7 // ~126 degrees
): [number, number][] => {
  if (points.length < 3) return points;
  
  const smoothedPoints: [number, number][] = [points[0]];
  
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const current = points[i];
    const next = points[i + 1];
    
    // Calculate vectors
    const vec1 = [current[0] - prev[0], current[1] - prev[1]];
    const vec2 = [next[0] - current[0], next[1] - current[1]];
    
    // Calculate angle between vectors
    const dot = vec1[0] * vec2[0] + vec1[1] * vec2[1];
    const mag1 = Math.sqrt(vec1[0] * vec1[0] + vec1[1] * vec1[1]);
    const mag2 = Math.sqrt(vec2[0] * vec2[0] + vec2[1] * vec2[1]);
    
    if (mag1 > 0 && mag2 > 0) {
      const angle = Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2))));
      
      if (angle < angleThreshold) {
        // Sharp angle detected, add intermediate points to soften it
        const midPoint1: [number, number] = [
          prev[0] + vec1[0] * 0.7,
          prev[1] + vec1[1] * 0.7
        ];
        const midPoint2: [number, number] = [
          current[0] + vec2[0] * 0.3,
          current[1] + vec2[1] * 0.3
        ];
        
        smoothedPoints.push(midPoint1, current, midPoint2);
      } else {
        smoothedPoints.push(current);
      }
    } else {
      smoothedPoints.push(current);
    }
  }
  
  smoothedPoints.push(points[points.length - 1]);
  return smoothedPoints;
};
