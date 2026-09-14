import React from "react";

/**
 * 1. FmsItem Component
 * This is a reusable component for each line item in the list.
 */
function FmsItem({ name, percentage }) {
  return (
    <div className="w-full">
      {/* Text row with name and percentage */}
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-medium text-gray-700">{name}</span>
        <span className="text-sm font-bold text-gray-800">{percentage}%</span>
      </div>

      {/* Progress bar container (the light gray track) */}
      <div className="w-full bg-gray-200 rounded-full h-3">
        {/* Filled portion of the progress bar */}
        <div
          className="bg-blue-500 h-3 rounded-full"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}

/**
 * 2. TopFmsCard Component
 * This is the main card component that holds the title and the list of items.
 */
function TopFmsCard({ title, items }) {
  return (
    <div className="font-sans">
      {/* Card Title */}
      <h3 className="text-md font-bold text-gray-700 mb-4">{title}</h3>

      {/* List of Items */}
      <div className="flex flex-col gap-3">
        {/* We map over the 'items' data array (passed as a prop) 
          and render an FmsItem for each one.
        */}
        {items.map((item, index) => (
          <FmsItem key={index} name={item.name} percentage={item.percentage} />
        ))}
      </div>
    </div>
  );
}

export default TopFmsCard;
