import React, { useState, useEffect } from 'react';
import { Checkbox } from './checkbox'; // Assuming checkbox component exists in ui folder
import { Label } from './label'; // Assuming label component exists in ui folder

const WorkingWeekCheckbox = ({ initialWorkingDays = {}, onChange }) => {
  const [workingDays, setWorkingDays] = useState({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
    ...initialWorkingDays,
  });

  useEffect(() => {
    setWorkingDays(prevDays => ({ ...prevDays, ...initialWorkingDays }));
  }, [initialWorkingDays]);

  const handleCheckboxChange = (day) => (checked) => {
    setWorkingDays((prevDays) => {
      const newDays = {
        ...prevDays,
        [day]: checked,
      };
      if (onChange) {
        onChange(newDays);
      }
      return newDays;
    });
  };

  const daysOfWeek = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {daysOfWeek.map((day) => (
        <div key={day} className="flex items-center space-x-2">
          <Checkbox
            id={day}
            checked={workingDays[day]}
            onCheckedChange={handleCheckboxChange(day)}
          />
          <Label htmlFor={day} className="capitalize">
            {day}
          </Label>
        </div>
      ))}
    </div>
  );
};

export default WorkingWeekCheckbox;
