import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ChevronUp } from 'lucide-react';

// --- UTILS ---
export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

// --- UI COMPONENTS ---
export const Card = ({ className, children }) => (
  <div className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}>
    {children}
  </div>
);
export const CardHeader = ({ className, children }) => (
  <div className={cn("flex flex-col space-y-1.5 p-6", className)}>{children}</div>
);
export const CardTitle = ({ className, children }) => (
  <h3 className={cn("text-2xl font-semibold leading-none tracking-tight", className)}>{children}</h3>
);
export const CardContent = ({ className, children }) => (
  <div className={cn("p-6 pt-0", className)}>{children}</div>
);

export const Button = React.forwardRef(({ className, variant = "default", size = "default", ...props }, ref) => {
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700 shadow-md",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline",
    destructive: "bg-red-500 text-white hover:bg-red-600 shadow-sm"
  };
  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10",
  };
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
});

export const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

export const Label = React.forwardRef(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}
    {...props}
  />
));

export const Badge = ({ className, variant = "default", ...props }) => {
  const variants = {
    default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
    outline: "text-foreground",
    secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
  };
  return (
    <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", variants[variant], className)} {...props} />
  );
};

export const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

export const Checkbox = React.forwardRef(({ className, ...props }, ref) => (
  <input
    type="checkbox"
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground accent-blue-600",
      className
    )}
    {...props}
  />
));

// --- Select Components ---
const SelectContext = createContext({});
export const Select = ({ value, onValueChange, children }) => {
  const [open, setOpen] = useState(false);
  const selectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className="relative" ref={selectRef}>{children}</div>
    </SelectContext.Provider>
  );
};
export const SelectTrigger = ({ className, children }) => {
  const { open, setOpen } = useContext(SelectContext);
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={cn("flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", className)}
    >
      {children}
      <ChevronUp className={cn("h-4 w-4 opacity-50 transition-transform", open ? "rotate-180" : "rotate-0")} />
    </button>
  );
};
export const SelectValue = ({ placeholder, items, itemValueKey = '_id', itemDisplayKey = 'name' }) => {
  const { value } = useContext(SelectContext);
  const [displayValue, setDisplayValue] = useState(placeholder);

  useEffect(() => {
    if (value === 'all' || !value) {
      setDisplayValue(placeholder);
    } else if (items && items.length > 0) {
      const selectedItem = items.find(item => item[itemValueKey] === value);
      if (selectedItem) {
        setDisplayValue(selectedItem[itemDisplayKey]);
      } else {
        setDisplayValue(value.charAt(0).toUpperCase() + value.slice(1));
      }
    } else if (value) {
      setDisplayValue(value.charAt(0).toUpperCase() + value.slice(1));
    } else {
      setDisplayValue(placeholder);
    }
  }, [value, placeholder, items, itemValueKey, itemDisplayKey]);

  return <span>{displayValue}</span>;
};
export const SelectContent = ({ className, children }) => {
  const { open } = useContext(SelectContext);
  if (!open) return null;
  return (
    <div className={cn("absolute z-[60] min-w-[8rem] rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-80 bg-white w-full max-h-60 overflow-y-auto", className)}>
      <div className="p-1">{children}</div>
    </div>
  );
};
export const SelectItem = ({ value, children, className }) => {
  const { onValueChange, setOpen } = useContext(SelectContext);
  return (
    <div
      onClick={() => { onValueChange(value); setOpen(false); }} data-value={value}
      className={cn("relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer hover:bg-gray-100", className)}
    >
      {children}
    </div>
  );
};

// --- Radio Group ---
const RadioGroupContext = createContext({});
export const RadioGroup = ({ value, onValueChange, className, children }) => {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      <div className={cn("grid gap-2", className)}>{children}</div>
    </RadioGroupContext.Provider>
  );
};

export const RadioGroupItem = ({ value: itemValue, id, className }) => {
  const { value, onValueChange } = useContext(RadioGroupContext);
  const isChecked = value === itemValue;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isChecked}
      onClick={() => onValueChange(itemValue)}
      id={id}
      className={cn(
        "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        isChecked ? "bg-blue-600" : "bg-transparent",
        className
      )}
    >
      {isChecked && <div className="h-2 w-2 rounded-full bg-white mx-auto mt-[3px]" />}
    </button>
  );
};

// --- Tabs ---
const TabsContext = React.createContext({});
export const Tabs = ({ defaultValue, className, children }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
};
export const TabsList = ({ className, children }) => (
  <div className={cn("inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground", className)}>{children}</div>
);
export const TabsTrigger = ({ value, className, children, onClick }) => {
  const { activeTab, setActiveTab } = useContext(TabsContext);
  const isActive = activeTab === value;
  return (
    <button
      onClick={() => { setActiveTab(value); if(onClick) onClick(); }}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive ? "bg-white text-black shadow-sm" : "hover:bg-gray-200",
        className
      )}
    >
      {children}
    </button>
  );
};
export const TabsContent = ({ value, children }) => {
  const { activeTab } = useContext(TabsContext);
  if (activeTab !== value) return null;
  return <div className="mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">{children}</div>;
};

// --- Dialog ---
export const Dialog = ({ open, onOpenChange, children, className }) => open ? <div className="fixed inset-0 z-50 bg-black/60 animate-in fade-in-0 flex items-center justify-center overflow-y-auto py-4"><div className={cn("relative z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg duration-200 animate-in fade-in-90 slide-in-from-top-1/2 rounded-lg m-4", className)}>{children}</div></div> : null;
export const DialogContent = ({ className, children }) => <div className={cn("max-h-[90vh] overflow-y-auto", className)}>{children}</div>;
export const DialogHeader = ({ children }) => <div className="flex flex-col space-y-1.5 text-center sm:text-left">{children}</div>;
export const DialogTitle = ({ children }) => <h2 className="text-lg font-semibold leading-none tracking-tight">{children}</h2>;
export const DialogDescription = ({ children }) => <p className="text-sm text-muted-foreground">{children}</p>;
export const DialogFooter = ({ children }) => <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4">{children}</div>;

// --- Dropdown Menu ---
const DropdownMenuContext = createContext({});
export const DropdownMenu = ({ children }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div ref={menuRef} className="relative inline-block text-left">{children}</div>
    </DropdownMenuContext.Provider>
  );
};
export const DropdownMenuTrigger = ({ asChild, children }) => {
  const { open, setOpen } = useContext(DropdownMenuContext);
  const child = React.Children.only(children);
  return React.cloneElement(child, { onClick: () => setOpen(!open) });
};
export const DropdownMenuContent = ({ children }) => {
  const { open } = useContext(DropdownMenuContext);
  return open ? <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">{children}</div> : null;
};
export const DropdownMenuItem = ({ onClick, className, children }) => {
  const { setOpen } = useContext(DropdownMenuContext);
  return <a href="#" onClick={(e) => { e.preventDefault(); onClick(); setOpen(false); }} className={cn("block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100", className)}>{children}</a>;
};

// --- Table ---
export const Table = ({ children }) => <div className="w-full overflow-auto"><table className="w-full caption-bottom text-sm table-auto">{children}</table></div>;
export const TableHeader = ({ children }) => <thead className="[&_tr]:border-b">{children}</thead>;
export const TableBody = ({ children }) => <tbody className="[&_tr:last-child]:border-0">{children}</tbody>;
export const TableRow = ({ children, className }) => <tr className={cn("border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted", className)}>{children}</tr>;
export const TableHead = ({ children, className }) => <th className={cn("h-12 px-2 text-left align-middle font-medium text-muted-foreground", className)}>{children}</th>;
export const TableCell = ({ children, className }) => <td className={cn("p-2 align-middle", className)}>{children}</td>;