import React from 'react';
import { CityMilepost as CityMilepostType } from '../types';

const CityMilepost: React.FC<CityMilepostType> = ({
  xCoord,
  yCoord,
  onClick,
  selected,
  color,
  isClickable,
  isPreviewTarget,
  city,
  connectedPlayers,
  onPointerEnter,
  onPointerLeave,
  ...props
}) => {
  return (
    <mesh
      position={[xCoord, yCoord, 1]}
      onClick={isClickable ? onClick : undefined}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      {...props}
    >
      <cylinderGeometry args={[3, 3, 2, 8]} />
      <meshStandardMaterial
        color={
          isPreviewTarget
            ? '#00ff00'
            : selected
            ? '#ffff00'
            : '#ff6666' // Red color for city mileposts
        }
      />
      {/* Add a small indicator showing connected players */}
      {connectedPlayers.length > 0 && (
        <mesh position={[0, 0, 1.5]}>
          <cylinderGeometry args={[1, 1, 0.5, 8]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      )}
    </mesh>
  );
};

export default CityMilepost;
