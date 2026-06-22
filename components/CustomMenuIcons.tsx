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
      strokeWidth={1.8} // Decreased thickness for a clean, thinner outline
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* বাইরের চারকোণা স্কয়ার ফ্রেম (কোণাগুলোর বাঁকানো ভাব আরো বাড়িয়ে ৫ করা হয়েছে) */}
      <path d="M12 4H8a5 5 0 0 0-5 5v6a5 5 0 0 0 5 5h7a5 5 0 0 0 5-5v-3" />
      
      {/* ভেতরের পেন্সিল বা এডিট আইকন */}
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      
      {/* পেন্সিলের উপরের ক্যাপ সেপারেটর ব্যান্ড (নিখুঁত ডায়াগোনাল এবং দৈর্ঘ্য কমানো হয়েছে) */}
      <path d="M16 5l3 3" />
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