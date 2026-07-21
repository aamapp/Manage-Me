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
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
      <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
      <g id="SVGRepo_iconCarrier">
        <path
          d="M11 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22H15C20 22 22 20 22 15V13"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16.04 3.02001L8.16 10.9C7.86 11.2 7.56 11.79 7.5 12.22L7.07 15.23C6.91 16.32 7.68 17.08 8.77 16.93L11.78 16.5C12.2 16.44 12.79 16.14 13.1 15.84L20.98 7.96001C22.34 6.60001 22.98 5.02001 20.98 3.02001C18.98 1.02001 17.4 1.66001 16.04 3.02001Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeMiterlimit="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14.91 4.1499C15.58 6.5399 17.45 8.4099 19.85 9.0899"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeMiterlimit="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
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
