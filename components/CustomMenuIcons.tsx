import React from "react";

interface IconProps {
  className?: string;
  size?: number;
}

export const CustomEditIcon: React.FC<IconProps> = ({
  className,
  size = 20,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Rounded square frame with elegant opening */}
      <path d="M12 4H9a5 5 0 0 0-5 5v6a5 5 0 0 0 5 5h6a5 5 0 0 0 5-5v-4" />

      {/* Chunky pencil outline with precise 45-degree angle */}
      <path d="M9 18L6.5 17.5L6 15L17 4a2.12 2.12 0 0 1 3 3L9 18z" />

      {/* Pencil cap separator */}
      <path d="M14 7l3 3" />
    </svg>
  );
};

export const CustomDeleteIcon: React.FC<IconProps> = ({
  className,
  size = 20,
}) => {
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
