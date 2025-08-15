import React, { useEffect, useState } from "react";
import type { MilepostProps } from "../types";

const MountainMilepost: React.FC<MilepostProps> = ({
  xCoord,
  yCoord,
  selected,
  color,
  onClick,
  isClickable = true,
}) => {
  const [x, setX] = useState(xCoord);
  const [y, setY] = useState(yCoord);
  const [isSelected, setIsSelected] = useState(selected);
  const [cost, setCost] = useState(1);
  const [currentColor, setCurrentColor] = useState(color);

  // Triangle geometry using three vertices
  const size = 3; // Size of the triangle
  const triangleShape = [
    [0, size, 0],
    [-size, -size, 0],
    [size, -size, 0],
  ];

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
      console.log(`Mountain Milepost at (${xCoord}, ${yCoord}) selected with color: ${color}`);
    }
  }, [xCoord, yCoord, selected, color]);

  return (
    <group position={[xCoord, yCoord, 0]}>
      <mesh onClick={handleClick}>
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
      {selected && (
        <mesh position={[0, 0, 0.1]}>
          <ringGeometry args={[size + 1, size + 2, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
};

export default MountainMilepost;
