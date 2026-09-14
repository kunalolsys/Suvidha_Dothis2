import React, { useState } from 'react';

const TimeFilterButtons = ({filterType, setFilterType}) => {
  
  const filters = [
    { id: 'all', label: 'All' },
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
  ];

  return (
    <div className='flex bg-gray-100 gap-1 p-2 items-center rounded-2xl shadow-sm'>
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => setFilterType(filter.id)}
          className={`
            px-6 py-1 rounded-md font-semibold text-sm transition-all duration-200
            ${filterType === filter.id
              ? 'bg-white text-blue-600 shadow-md border border-blue-100'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }
          `}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
};

export default TimeFilterButtons;