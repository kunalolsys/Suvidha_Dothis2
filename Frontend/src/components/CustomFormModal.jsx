import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Label } from "../components/ui/label";
import { Trash2 } from "lucide-react";
import { Checkbox } from "./ui/checkbox";

const CustomFormModal = ({
  open,
  onClose,
  formFields = [],
  onSave,
  isView = false,
}) => {
  const [fields, setFields] = useState(
    formFields.map((f) => ({
      fieldName: f.fieldName || "",
      fieldType: f.fieldType || "text",
      isMandatory: f.isMandatory || false,
      options: f.options || [], // ✅ ADD THIS
    })),
  );
  useEffect(() => {
    if (open) {
      setFields(
        (formFields || []).map((f) => ({
          fieldName: f.fieldName || "",
          fieldType: f.fieldType || "text",
          isMandatory: f.isMandatory || false,
          options: f.options || [], // ✅ ADD THIS
        })),
      );
    }
  }, [formFields, open]);
  const [newField, setNewField] = useState({
    fieldName: "",
    fieldType: "text",
    isMandatory: false,
    options: [], // ✅ ADD THIS
  });

  const fieldTypes = [
    "text",
    "number",
    "date",
    "dropdown",
    "checkbox",
    "textarea",
    // "file",
  ];

  // const addField = () => {
  //   if (newField.fieldName.trim()) {
  //     setFields([
  //       ...fields,
  //       { ...newField, fieldName: newField.fieldName.trim() },
  //     ]);
  //     setNewField({ fieldName: "", fieldType: "text", isMandatory: false });
  //   }
  // };
  const addField = () => {
    if (newField.fieldName.trim()) {
      setFields([
        ...fields,
        {
          ...newField,
          fieldName: newField.fieldName.trim(),
          options: newField.options || [],
        },
      ]);

      setNewField({
        fieldName: "",
        fieldType: "text",
        isMandatory: false,
        options: [], // reset
      });
    }
  };
  const updateField = (index, key, value) => {
    const newFields = [...fields];

    newFields[index][key] = value;

    // 🔥 Reset options if not needed
    if (
      key === "fieldType" &&
      !["dropdown", "multiselect", "radio", "checkbox"].includes(value)
    ) {
      newFields[index].options = [];
    }

    setFields(newFields);
  };
  const removeField = (index) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const cleaned = fields
      .filter((f) => f.fieldName.trim())
      .map((f) => ({
        ...f,
        options: (f.options || []).filter(
          (opt) => opt.label.trim() && opt.value.trim(),
        ),
      }));

    onSave(cleaned);
    onClose();
  };
  const addOption = (index) => {
    const updated = [...fields];
    updated[index].options = [
      ...(updated[index].options || []),
      { label: "", value: "" },
    ];
    setFields(updated);
  };

  const updateOption = (fieldIndex, optIndex, key, value) => {
    const updated = [...fields];
    updated[fieldIndex].options[optIndex][key] = value;
    setFields(updated);
  };

  const removeOption = (fieldIndex, optIndex) => {
    const updated = [...fields];
    updated[fieldIndex].options.splice(optIndex, 1);
    setFields(updated);
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Custom Form Builder</DialogTitle>
          <DialogDescription>
            Fields entered here will be shown to the doer when completing this
            task.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col flex-1 overflow-hidden space-y-3">
          {!isView && (
            <div className="space-y-2 p-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                <Input
                  placeholder="Field label..."
                  value={newField.fieldName}
                  onChange={(e) =>
                    setNewField({ ...newField, fieldName: e.target.value })
                  }
                />
                <Select
                  value={newField.fieldType}
                  onValueChange={(v) =>
                    setNewField({ ...newField, fieldType: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={newField.isMandatory}
                    onCheckedChange={(checked) =>
                      setNewField({ ...newField, isMandatory: checked })
                    }
                  />
                  <Label className="text-sm">Required</Label>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={addField}
                className="w-full"
              >
                + Add Field
              </Button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto space-y-2">
            {fields.map((field, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end p-3 border rounded-md hover:bg-muted"
              >
                <div>
                  <Label className="text-xs">Label</Label>
                  <Input
                    value={field.fieldName}
                    onChange={(e) =>
                      updateField(index, "fieldName", e.target.value)
                    }
                    disabled={isView}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={field.fieldType}
                    onValueChange={(v) => updateField(index, "fieldType", v)}
                    disabled={isView}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {["dropdown", "multiselect", "radio", "checkbox"].includes(
                  field.fieldType,
                ) && (
                  <div className="col-span-3 space-y-2">
                    <Label className="text-xs">Options</Label>

                    {field.options?.map((opt, optIndex) => (
                      <div key={optIndex} className="flex gap-2">
                        <Input
                          placeholder="Label"
                          value={opt.label}
                          onChange={(e) =>
                            updateOption(
                              index,
                              optIndex,
                              "label",
                              e.target.value,
                            )
                          }
                          disabled={isView}
                        />
                        <Input
                          placeholder="Value"
                          value={opt.value}
                          onChange={(e) =>
                            updateOption(
                              index,
                              optIndex,
                              "value",
                              e.target.value,
                            )
                          }
                          disabled={isView}
                        />
                        {!isView && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => removeOption(index, optIndex)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}

                    {!isView && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => addOption(index)}
                      >
                        + Add Option
                      </Button>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={field.isMandatory}
                    disabled={isView}
                    onCheckedChange={(checked) =>
                      updateField(index, "isMandatory", checked)
                    }
                  />
                  <Label className="text-xs whitespace-nowrap">Required</Label>
                  {!isView && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 ml-auto"
                      onClick={() => removeField(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {fields.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No form fields yet. Add one above!
              </div>
            )}
          </div>
        </div>
        {!isView && (
          <div className="flex gap-2 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1">
              Save Form ({fields.length})
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CustomFormModal;
