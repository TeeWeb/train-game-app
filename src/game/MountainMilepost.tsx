import React, { useEffect, useState } from "react";
import type { MilepostProps } from "../types";

const MountainMilepost: React.FC<MilepostProps> = ({
  xCoord,
  yCoord,
  selected,
  color,
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

  useEffect(() => {
    setX(xCoord);
    setY(yCoord);
    setIsSelected(selected);
  }, [xCoord, yCoord, selected]);

  const toggleSelect = () => {
    console.log("Toggling selection for MountainMilepost at:", x, y);
    setIsSelected(!isSelected);
  };

  return (
    <mesh position={[xCoord, yCoord, 0]}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={new Float32Array(triangleShape.flat())}
          count={3}
          itemSize={3}
        />
      </bufferGeometry>
      <meshStandardMaterial color={currentColor} />
    </mesh>
  );
};

export default MountainMilepost;
