import { useEffect, useState } from "react";
import type { MilepostProps } from "../types";

const Milepost: React.FC<MilepostProps> = ({
  xCoord,
  yCoord,
  selected = false,
  color,
  onClick,
  isClickable = true, // New prop to indicate if the milepost is clickable
  onPointerEnter,
  onPointerLeave,
  isPreviewTarget = false,
}) => {
  const [x, setX] = useState(xCoord);
  const [y, setY] = useState(yCoord);
  const [isSelected, setIsSelected] = useState(selected);
  const [cost, setCost] = useState(1);
  const [currentColor, setCurrentcolor] = useState(color);
  const [size, setSize] = useState(2); // Default size for the milepost
  const actualSize = isPreviewTarget ? size * 2 : size; // Double size for preview target

  const handleClick = () => {
    console.log("Milepost clicked at:", x, y);
    if (onClick && isClickable) {
      onClick();
    }
  };

  useEffect(() => {
    setX(xCoord);
    setY(yCoord);
    setIsSelected(selected);
    setCurrentcolor(color);
    
    // Debug logging
    if (selected) {
      console.log(`Milepost at (${xCoord}, ${yCoord}) selected with color: ${color}`);
    }
  }, [xCoord, yCoord, selected, color]);

  return (
    <group position={[x, y, 0]}>
      {/* Invisible larger sphere for easier clicking */}
      <mesh 
        onClick={handleClick}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        <sphereGeometry args={[size * 1.5, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      
      {/* Visible milepost */}
      <mesh>
        <sphereGeometry args={[actualSize, actualSize, actualSize]} />
        <meshStandardMaterial 
          color={selected ? color : "black"} 
          emissive={selected ? color : "#000000"}
          emissiveIntensity={selected ? 0.3 : 0}
          opacity={isClickable ? 1.0 : 0.5}
          transparent={!isClickable}
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

export default Milepost;
