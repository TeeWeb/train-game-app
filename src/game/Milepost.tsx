import { useEffect, useState } from "react";
import type { MilepostProps } from "../types";

const Milepost: React.FC<MilepostProps> = ({
  xCoord,
  yCoord,
  selected = false,
  color,
}) => {
  const [x, setX] = useState(xCoord);
  const [y, setY] = useState(yCoord);
  const [isSelected, setIsSelected] = useState(selected);
  const [cost, setCost] = useState(1);
  const [currentColor, setCurrentcolor] = useState(color);

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fillStyle = selected ? "orange" : "black";
    ctx.fill();
    ctx.closePath();
  };

  const toggleSelect = () => {
    console.log("Toggling selection for Milepost at:", x, y);
    selected = !selected;
  };

  useEffect(() => {
    setX(xCoord);
    setY(yCoord);
    setIsSelected(selected);
  }, [xCoord, yCoord, selected]);

  return (
    <mesh position={[x, y, 0]} onClick={toggleSelect}>
      <sphereGeometry args={[3, 3, 3]} />
      <meshStandardMaterial color={currentColor} />
    </mesh>
  );
};

export default Milepost;
