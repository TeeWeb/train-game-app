import React, { useEffect, useState, useMemo } from "react";
import type { MilepostProps } from "../types";

const MountainMilepost: React.FC<MilepostProps> = ({
  xCoord,
  yCoord,
  selected,
  color,
  onClick,
  isClickable = true,
  onPointerEnter,
  onPointerLeave,
  isPreviewTarget = false,
}) => {
  const [x, setX] = useState(xCoord);
  const [y, setY] = useState(yCoord);
  const [isSelected, setIsSelected] = useState(selected);
  const [cost, setCost] = useState(1);
  const [currentColor, setCurrentColor] = useState(color);

  // Triangle geometry using three vertices
  const size = 3; // Size of the triangle
  const actualSize = isPreviewTarget ? size * 2 : size; // Double size for preview target
  
  // Calculate triangle shape dynamically based on actualSize
  const triangleShape = useMemo(() => [
    [0, actualSize, 0],
    [-actualSize, -actualSize, 0],
    [actualSize, -actualSize, 0],
  ], [actualSize]);

  const handleClick = () => {
    console.log("Mountain Milepost clicked at:", x, y);
    if (onClick && isClickable) {
      onClick();
    }
  };

  useEffect(() => {
    setX(xCoord);
    setY(yCoord);
    setIsSelected(selected);
    setCurrentColor(color);

    // Debug logging
    if (selected) {
      console.log(
        `Mountain Milepost at (${xCoord}, ${yCoord}) selected with color: ${color}`
      );
    }
  }, [xCoord, yCoord, selected, color]);

  return (
    <group position={[xCoord, yCoord, 0]}>
      {/* Invisible larger sphere for easier clicking */}
      <mesh
        onClick={handleClick}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        <sphereGeometry args={[size * 1.5, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Visible mountain triangle */}
      <mesh key={actualSize}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={new Float32Array(triangleShape.flat())}
            count={3}
            itemSize={3}
          />
        </bufferGeometry>
        <meshStandardMaterial
          color={selected ? color : "#000000"}
          emissive={selected ? color : "#000000"}
          emissiveIntensity={selected ? 0.3 : 0}
        />
      </mesh>

      {/* Selection ring */}
      {selected && (
        <mesh position={[0, 0, 0.1]}>
          <ringGeometry args={[actualSize + 1, actualSize + 2, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
};

export default MountainMilepost;
