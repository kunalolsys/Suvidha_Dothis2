import React, { useState } from "react";
import { BookOpen, Download, HelpCircle, X } from "lucide-react";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "framer-motion";
import DocxViewer from "./DocPreview";

const FloatingManualButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  const downloadFile = (filename) => {
    const link = document.createElement("a");
    link.href = `/doc/${filename}`;
    link.download = filename;
    link.click();
  };

  const viewFile = (filename) => {
    setPreviewFile(`/doc/${filename}`);
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="icon"
          className="w-14 h-14 rounded-full shadow-lg bg-indigo-600 hover:bg-indigo-700"
          onClick={() => setIsOpen(!isOpen)}
        >
          <HelpCircle className="w-6 h-6 text-white" />
        </Button>
      </div>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-24 right-6 w-72 bg-white border rounded-xl shadow-xl p-4 space-y-3 z-50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <h3 className="text-sm font-semibold text-gray-700">User Manual</h3>

            {/* View */}
            <button
              onClick={() => viewFile("DoThis2_User_Manual.docx")}
              className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-gray-100 transition"
            >
              <BookOpen className="w-5 h-5 text-blue-600" />
              <span className="text-sm">View Manual</span>
            </button>

            {/* Download */}
            <button
              onClick={() => downloadFile("DoThis2_User_Manual.docx")}
              className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-gray-100 transition"
            >
              <Download className="w-5 h-5 text-green-600" />
              <span className="text-sm">Download Manual</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white w-[90%] max-w-4xl h-[85%] rounded-lg shadow-lg flex flex-col"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2 border-b">
                <span className="text-sm font-medium text-gray-700">
                  User Manual Preview
                </span>
                <button onClick={() => setPreviewFile(null)}>
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Viewer */}
              <div className="flex-1 overflow-auto p-4">
                <DocxViewer fileUrl={previewFile} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingManualButton;
