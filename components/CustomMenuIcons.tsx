import React from "react";

interface IconProps {
  className?: string;
  size?: number;
}

export const CustomEditIcon: React.FC<IconProps> = ({ className, size = 20 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Outer container: a beautifully rounded squircle with a perfect, clean top-right opening */}
      <path d="M 13 4 H 9 A 5 5 0 0 0 4 9 V 15 A 5 5 0 0 0 9 20 H 15 A 5 5 0 0 0 20 15 V 12" />
      {/* Slanted pencil body: a mathematically perfect, stout 45-degree elegant outline sticking out of the border with a symmetric pointy tip */}
      <path d="M 9 15 L 9.5 11.5 L 15.5 5.5 A 2.12 2.12 0 0 1 18.5 8.5 L 12.5 14.5 Z" />
      {/* Pencil tip separator */}
      <path d="M 9.5 11.5 L 12.5 14.5" />
      {/* Pencil cap/eraser separator */}
      <path d="M 14 7 L 17 10" />
    </svg>
  );
};

export const CustomDeleteIcon: React.FC<IconProps> = ({ className, size = 20 }) => {
  const scaledSize = Math.round(size * 1.15); // Slightly larger
  return (
    <svg
      width={scaledSize}
      height={scaledSize}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Lid handle */}
      <path d="M10 9V7.2c0-.7.5-1.2 1.2-1.2h1.6c.7 0 1.2.5 1.2 1.2V9" />
      {/* Lid bar */}
      <path d="M5 9h14" />
      {/* Grab can body with rounded corner */}
      <path d="M7 9l.5 9c0 1.5 1.2 2.5 2.5 2.5h4c1.3 0 2.5-1 2.5-2.5l.5-9" />
      {/* 2 horizontal lines inside, exactly as in reference */}
      <path d="M10 13h4" />
      <path d="M10 16h4" />
    </svg>
  );
};
