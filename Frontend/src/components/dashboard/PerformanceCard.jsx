import React from 'react';

// Set a max height for the tallest bar (Total) in pixels
const MAX_BAR_HEIGHT = 110; // You can adjust this value

const PerformanceCard = ({ title, total, onTime, delayed }) => {
  
  // Calculate heights relative to the total value
  const onTimeHeight = total > 0 ? (onTime / total) * MAX_BAR_HEIGHT : 0;
  const delayedHeight = total > 0 ? (delayed / total) * MAX_BAR_HEIGHT : 0;

  // Base classes for all bars to avoid repetition
  const baseBarClasses = "w-[60px] rounded-md transition-all duration-300 ease-out";

  return (
    <div className="bg-white rounded-xl p-5 font-sans shadow-lg py-6">
      
      {/* --- Title --- */}
      <h3 className="text-lg font-bold text-gray-600 mb-3">{title}</h3>
      
      <div className="flex justify-around items-end text-center">
        
        {/* --- Total Column --- */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xl font-bold text-gray-900">{total}</span>
          <div
            className={`${baseBarClasses} bg-[#5b93ff]`}
            style={{ height: `${MAX_BAR_HEIGHT}px`,width:"50px" }}
          ></div>
          <span className="text-sm text-gray-600 font-medium">Total</span>
        </div>

        {/* --- On-Time Column --- */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-xl font-bold text-gray-900">{onTime}</span>
          <div
            className={`${baseBarClasses} bg-[#4dc47e]`}
            style={{ height: `${onTimeHeight}px`,width:"50px"  }}
          ></div>
          <span className="text-sm text-gray-600 font-medium">On-Time</span>
        </div>

        {/* --- Delayed Column --- */}
        <div className="flex flex-col items-center gap-2.5">
          <span className="text-xl font-bold text-gray-900">{delayed}</span>
          <div
            className={`${baseBarClasses} bg-[#ff6b6b]`}
            style={{ height: `${delayedHeight}px`,width:"50px"  }}
          ></div>
          <span className="text-sm text-gray-600 font-medium">Delayed</span>
        </div>
        
      </div>
    </div>
  );
};

export default PerformanceCard;