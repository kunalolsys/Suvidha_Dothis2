import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Checkbox } from "../components/ui/checkbox";
import { Badge } from "../components/ui/badge";
import { Label } from "./ui";
import { Trash2 } from "lucide-react";

const ChecklistModal = ({
  open,
  onClose,
  checklist = [],
  onSave,
  isView = false,
}) => {
  const [items, setItems] = useState(
    checklist.map((item) => ({
      text: item.text || item,
      isMandatory: item.isMandatory || false,
    })),
  );
  useEffect(() => {
    if (open) {
      setItems(
        (checklist || []).map((f) => ({
          text: f.text || "",
          isMandatory: f.isMandatory || false,
        })),
      );
    }
  }, [checklist, open]);
  const [newItem, setNewItem] = useState("");

  const addItem = () => {
    if (newItem.trim()) {
      setItems([...items, { text: newItem.trim(), isMandatory: false }]);
      setNewItem("");
    }
  };

  const updateItem = (index, text) => {
    const newItems = [...items];
    newItems[index].text = text;
    setItems(newItems);
  };

  const toggleMandatory = (index) => {
    const newItems = [...items];
    newItems[index].isMandatory = !newItems[index].isMandatory;
    setItems(newItems);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(items.filter((item) => item.text.trim()));
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Checklist Items</DialogTitle>
          <DialogDescription>Manage checklist for this task</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!isView && (
            <div className="flex gap-2">
              <Input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="Add new checklist item..."
                onKeyPress={(e) => e.key === "Enter" && addItem()}
              />
              <Button type="button" size="sm" onClick={addItem}>
                Add
              </Button>
            </div>
          )}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-2 rounded-md border hover:bg-muted"
              >
                <span className="text-muted-foreground font-mono text-xs w-6 flex-shrink-0">
                  ⋮⋮
                </span>
                <Input
                  value={item.text}
                  onChange={(e) => updateItem(index, e.target.value)}
                  className="flex-1 h-8"
                  disabled={isView}
                  placeholder="Checklist item..."
                />
                {!isView && (
                  <div className="flex items-center gap-1 text-xs">
                    <Checkbox
                      id={`req-${index}`}
                      checked={item.isMandatory}
                      onCheckedChange={() => toggleMandatory(index)}
                    />
                    <Label htmlFor={`req-${index}`} className="cursor-pointer">
                      Req
                    </Label>
                  </div>
                )}
                {!isView && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive-foreground"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          {items.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No checklist items yet
            </p>
          )}
        </div>
        <div className="flex gap-2 pt-4">
          {!isView && (
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
          {!isView && (
            <Button onClick={handleSave}>
              Save {items.length > 0 && `(${items.length})`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChecklistModal;
