import { useEffect, useState } from "react";
import type { MilepostProps } from "../types";

const Milepost: React.FC<MilepostProps> = ({
  xCoord,
  yCoord,
  selected = false,
  color,
  onClick,
  isClickable = true,
  onPointerEnter,
  onPointerLeave,
  isPreviewTarget = false,
  isMountain = false,
  isCity = false,
  city,
  connectedPlayers = [],
}) => {
  const [x, setX] = useState(xCoord);
  const [y, setY] = useState(yCoord);
  const [isSelected, setIsSelected] = useState(selected);
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
      console.log(
        `Milepost at (${xCoord}, ${yCoord}) selected with color: ${color}`
      );
    }
  }, [xCoord, yCoord, selected, color]);

  // Determine milepost appearance based on type
  const getMilepostColor = () => {
    if (isPreviewTarget) return "#00ff00";
    if (selected) return color;
    return "black"; // Default for regular and mountain mileposts
  };

  const getMilepostGeometry = () => {
    if (isMountain) {
      // Mountain mileposts use cone geometry to represent triangular mountains
      return <coneGeometry args={[3, 6, 8]} />;
    } else if (isCity) {
      // City mileposts use cylinder geometry with different dimensions
      return <cylinderGeometry args={[3, 3, 2, 8]} />;
    } else {
      // Regular mileposts use sphere geometry
      return <sphereGeometry args={[actualSize, actualSize, actualSize]} />;
    }
  };

  return (
    <group position={[x, y, isMountain || isCity ? 1 : 0]}>
      {/* Invisible larger sphere for easier clicking */}
      <mesh
        onClick={handleClick}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        <sphereGeometry args={[2.5, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Visible milepost */}
      <mesh>
        {getMilepostGeometry()}
        <meshStandardMaterial
          color={getMilepostColor()}
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

      {/* City milepost connected players indicator */}
      {isCity && connectedPlayers && connectedPlayers.length > 0 && (
        <mesh position={[0, 0, 1.5]}>
          <cylinderGeometry args={[1, 1, 0.5, 8]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      )}
    </group>
  );
};

export default Milepost;
