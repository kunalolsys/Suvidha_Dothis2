import React, { useState, useRef } from 'react';
import {
  Upload, Download, FileText,
  Clock, RefreshCw, Link,
  CheckSquare, Calendar, User,
  Building, Paperclip, AlertCircle,
  HelpCircle, ChevronRight, FileSpreadsheet, Folder
} from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';

const ImportTask = () => {
  // --- STATE AND LOGIC (UNCHANGED) ---
  const [selectedTemplate, setSelectedTemplate] = useState('delegation');
  const [importData, setImportData] = useState([]);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef(null);

  // Missing state from your snippet provided, assuming these exist based on usage in JSX
  // Added a default state for uploadAction to prevent crash if it was missing
  const [uploadAction, setUploadAction] = useState(null);

  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [uploadedAttachmentNames, setUploadedAttachmentNames] = useState([]);
  const [uploadedAttachmentBackendNames, setUploadedAttachmentBackendNames] = useState([]);
  const attachmentFileInputRef = useRef(null);
  const attachmentFolderInputRef = useRef(null);

  const templates = {
    delegation: {
      name: "Delegation Task",
      subtitle: "Independent",
      icon: <User className="w-6 h-6" />,
      color: "bg-blue-50 border-blue-200",
      activeBorder: "border-blue-500",
      textColor: "text-blue-700",
      columns: [
        { name: "Task Title", type: "Text", required: true },
        { name: "Task Description", type: "Text", required: true },
        { name: "Assign To(Email)", type: "Text", required: true },
        { name: "Assign To(Name)", type: "Text", required: false },
        { name: "Assign To UserDepartment", type: "Text", required: true },
        { name: "Check List", type: "Optional", required: false },
        { name: "Start Date", type: "DD-MM-YYYY", required: true },
        { name: "Due Date", type: "DD-MM-YYYY", required: true },
        { name: "Attachment File", type: "File", required: false }
      ],
      demoData: ["Sample Delegation Task", "Description...", "user@example.com", "John", "Engineering", '"item1,item2"', "01-08-2024", "10-08-2024", "file.pdf"]
    },
    recurring: {
      name: "Recurring Task",
      subtitle: "Scheduled",
      icon: <RefreshCw className="w-6 h-6" />,
      color: "bg-emerald-50 border-emerald-200",
      activeBorder: "border-emerald-500",
      textColor: "text-emerald-700",
      columns: [
        { name: "Task Title", type: "Text", required: true },
        { name: "Task Description", type: "Text", required: true },
        { name: "Assign To(Email)", type: "Text", required: true },
        { name: "Assign To(Name)", type: "Text", required: false },
        { name: "Assign To UserDepartment", type: "Text", required: true },
        { name: "Check List", type: "Optional", required: false },
        { name: "Start Date", type: "DD-MM-YYYY", required: true },
        { name: "Frequency", type: "Text (Daily, Weekly, etc.)", required: true, options: ["Daily", "Weekly", "etc"] },
        { name: "Week Days", type: "Text (Sunday, Monday, etc.)", required: true, options: ["Sunday", "Monday", "etc"] },
        { name: "End Date", type: "DD-MM-YYYY", required: true },
        { name: "Attachment File", type: "File", required: false }
      ],
      demoData: ["Recurring Task", "Desc...", "user@example.com", "John", "Eng", '"itemA,itemB"', "01-08-2024", "Weekly", '"Monday,Wednesday,Friday"', "31-12-2024", "file.docx"]
    },
    dependent: {
      name: "Dependent Task",
      subtitle: "Linked",
      icon: <Link className="w-6 h-6" />,
      color: "bg-purple-50 border-purple-200",
      activeBorder: "border-purple-500",
      textColor: "text-purple-700",
      columns: [
        { name: "Task ID", type: "Parent Task", required: true },
        { name: "Task Title", type: "Text", required: true },
        { name: "Task Description", type: "Text", required: true },
        { name: "Assign To(Email)", type: "Text", required: true },
        { name: "Assign To(Name)", type: "Text", required: false },
        { name: "Assign To UserDepartment", type: "Text", required: true },
        { name: "Check List", type: "Optional", required: false },
        { name: "Start Time Setting", type: "Planned to Planned / Actual to Planned", required: true },
        { name: "Frequency", type: "T+X days / T+X hours", required: true, value: "T+X days" },
        { name: "X Value", type: "Number", required: true },
        { name: "Attachment File", type: "File", required: false }
      ],
      demoData: ["25120001", "Dependent Task", "Desc...", "user@example.com", "John", "Eng", '"item1,item2"', "Planned to Planned", "T+X days", "2", ""]
    }
  };

  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  const [errorFileUrl, setErrorFileUrl] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Client-side file size validation (2MB limit)
      if (selectedFile.size > 2 * 1024 * 1024) {
        toast.error("File size cannot exceed 2MB.");
        return;
      }

      setFile(selectedFile);
      setUploadedFileName(selectedFile.name);
      setImportData([]);
      setImportError(null);
      setErrorFileUrl(null);
    }
  };

  const handleUploadClick = () => {
    // Reset input value so selecting the same file again will fire the change event
    if (fileInputRef.current) fileInputRef.current.value = null;
    fileInputRef.current.click();
  };

  const handleAttachmentFileChange = (e) => {
    const selectedFiles = e.target.files;
    if (selectedFiles.length > 0) {
      const filesArray = Array.from(selectedFiles);

      // Client-side file size validation for each file (2MB limit)
      for (const file of filesArray) {
        if (file.size > 2 * 1024 * 1024) {
          toast.error(`File "${file.name}" is too large. Each file cannot exceed 2MB.`);
          return;
        }
      }

      setAttachmentFiles(filesArray);
      handleAttachmentUpload(Array.from(selectedFiles));
    }
  };

  const handleAttachmentFilesClick = () => {
    // Logic placeholder for safety if uploadAction was used in your original logic
    setUploadAction('files');
    if (attachmentFileInputRef.current) attachmentFileInputRef.current.value = null;
    attachmentFileInputRef.current.click();
  };

  const handleAttachmentFolderClick = () => {
    // Logic placeholder
    setUploadAction('folder');
    if (attachmentFolderInputRef.current) attachmentFolderInputRef.current.value = null;
    attachmentFolderInputRef.current.click();
  };

  const handleAttachmentUpload = async (filesToUpload) => {
    if (filesToUpload.length === 0) {
      toast.error("Please select attachment files first!");
      return;
    }

    setIsUploadingAttachment(true);
    setUploadedAttachmentNames(filesToUpload.map(f => f.name));

    const formData = new FormData();
    filesToUpload.forEach(file => {
      formData.append('attachments', file);
    });

    try {
      const response = await api.post('/tasks/upload-attachment', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        setUploadedAttachmentBackendNames(response.data.data.filenames);
      } else {
        throw new Error(response.data.message || "Upload failed");
      }
    } catch (error) {
      console.error("Attachment upload error:", error);
      if (error.response && error.response.status === 409) {
        toast.error(error.response.data.message);
      } else {
        toast.error(`Error uploading attachments: ${error.response?.data?.message || error.message}`);
      } setUploadedAttachmentNames([]);
      setUploadedAttachmentBackendNames([]);
    } finally {
      setIsUploadingAttachment(false);
      setUploadAction(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Please upload a file first!");
      return;
    }

    setIsImporting(true);
    setImportError(null);
    setErrorFileUrl(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/tasks/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.status === 201) {
        toast.success(response.data.message);
        setFile(null);
        setUploadedFileName('');
        setImportData([]);
      }
    } catch (error) {
      console.error("Import error:", error);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (error.response.status === 422) {
          // Validation error with a downloadable report
          setImportError(error.response.data.message || "The uploaded file has validation errors.");
          const fullUrl = `${api.defaults.baseURL}/tasks/download/${error.response.data.errorFile}`;
          setErrorFileUrl(fullUrl);
        } else if (error.response.status === 500) {
          setImportError("A server error occurred during import. Please check the server logs or contact support.");
        } else {
          // Other server errors (400, 401, 403, etc.)
          setImportError(error.response.data?.message || `An error occurred: ${error.response.statusText}`);
        }
      } else {
        // Something happened in setting up the request that triggered an Error (e.g., network error)
        setImportError("Network error or cannot connect to the server. Please check your connection.");
      }
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = templates[selectedTemplate];
    const headers = template.columns.map(col => col.name);
    const demoRow = template.demoData;
    const csvContent = [headers.join(','), demoRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.replace(/\s+/g, '_')}_Template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // --- UI RENDER ---
  return (
    <div className="min-h-screen bg-gray-50/50 pb-2">
      {/* Header with gradient strip */}
      <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2.5 rounded-lg shadow-lg shadow-blue-600/20">
              <FileSpreadsheet className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Bulk Import Tasks</h1>
              <p className="text-sm text-gray-500 font-medium">Manage and import large datasets efficiently</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT COLUMN: Main Process (Span 8) */}
          <div className="lg:col-span-8 space-y-4">

            {/* Step 1: Select Template */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-3 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">1</span>
                  <h2 className="text-lg font-bold text-gray-800">Select Template</h2>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="text-sm flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold px-4 py-2 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download CSV Template
                </button>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  {Object.entries(templates).map(([key, template]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedTemplate(key)}
                      className={`relative p-4 rounded-xl border transition-all duration-300 group text-left
                        ${selectedTemplate === key
                          ? `bg-white border-blue-500 ring-2 ring-blue-500/20 shadow-md`
                          : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                        }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className={`p-1 rounded-lg ${template.color} group-hover:scale-110 transition-transform`}>
                          {template.icon}
                        </div>
                        {selectedTemplate === key && (
                          <span className="bg-blue-600 w-2 h-2 rounded-full animate-pulse"></span>
                        )}
                        <div>
                          <h3 className="font-bold text-sm text-gray-900">{template.name}</h3>
                          <p className="text-xs text-gray-500 mt-1">{template.subtitle}</p>
                        </div>
                      </div>

                    </button>
                  ))}
                </div>

                {/* Column Specifications */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-gray-500" />
                    Required Columns Structure
                  </h3>
                  <div className="flex flex-wrap gap-2 p-3 bg-white border border-gray-200 rounded-lg">
                    {templates[selectedTemplate].columns.map((col, index) => (
                      <div key={index} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border
                        ${col.required
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                        <span>{col.name}</span>({col.type})
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Step 2: Upload Attachments */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold text-sm">2</span>
                <h2 className="text-lg font-bold text-gray-800">Upload Attachments (Optional)</h2>
              </div>

              <div className="p-4">
                <div className="border-2 border-dashed border-indigo-100 rounded-2xl bg-indigo-50/30 p-2 text-center transition-colors hover:bg-indigo-50/60">
                  <input type="file" ref={attachmentFileInputRef} onChange={handleAttachmentFileChange} className="hidden" multiple />
                  <input type="file" ref={attachmentFolderInputRef} onChange={handleAttachmentFileChange} className="hidden" webkitdirectory="true" />

                  <div className="bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Paperclip className="w-8 h-8 text-indigo-600" />
                  </div>

                  <h3 className="text-gray-900 font-semibold mb-2">Drag & drop files or folders here</h3>
                  <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                    If your Excel sheet references files, upload them here first so the backend can link them.
                  </p>

                  <div className="flex flex-wrap justify-center gap-3">
                    <button
                      onClick={handleAttachmentFilesClick}
                      disabled={isUploadingAttachment || (isUploading && uploadAction === 'folder')}
                      className="px-5 py-2.5 bg-white border border-indigo-200 text-indigo-700 font-medium rounded-lg shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isUploadingAttachment ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                      Select Files
                    </button>
                    <button
                      onClick={handleAttachmentFolderClick}
                      disabled={isUploadingAttachment || (isUploading && uploadAction === 'files')}
                      className="px-5 py-2.5 bg-white border border-indigo-200 text-indigo-700 font-medium rounded-lg shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isUploadingAttachment ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Folder className="w-4 h-4" />}
                      Select Folder
                    </button>
                  </div>

                  {uploadedAttachmentBackendNames.length > 0 && !isUploadingAttachment && (
                    <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full border border-green-200 text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
                      <span>✓ {uploadedAttachmentBackendNames.length} files attached successfully</span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Step 3: Upload Data & Import */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-2 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600 font-bold text-sm">3</span>
                <h2 className="text-lg font-bold text-gray-800">Upload File — {templates[selectedTemplate].name}</h2>
              </div>

              <div className="p-3">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".csv,.xlsx,.xls" />

                <div className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all duration-300
                  ${uploadedFileName ? 'border-green-300 bg-green-50/30' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}>

                  {uploadedFileName ? (
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                        <FileSpreadsheet className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{uploadedFileName}</h3>
                        <p className="text-green-600 text-sm font-medium">Ready for import</p>
                      </div>
                      <button
                        onClick={handleUploadClick}
                        className="text-gray-500 hover:text-gray-700 text-sm underline"
                      >
                        Change File
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
                        <Upload className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Upload CSV or Excel</h3>
                        <p className="text-gray-500 text-sm mt-1">Select your formatted data file</p>
                      </div>
                      <button
                        onClick={handleUploadClick}
                        className="px-6 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-black transition-colors shadow-lg shadow-gray-200"
                      >
                        Browse Files
                      </button>
                    </div>
                  )}
                </div>

                {/* Error Display */}
                {importError && (
                  <div className="mt-0 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-2 animate-in slide-in-from-top-2">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-red-800">Import Failed</h4>
                      <p className="text-sm text-red-700 mt-1">{importError}</p>
                      {errorFileUrl && (
                        <a href={errorFileUrl} download className="inline-flex items-center gap-2 mt-3 text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors">
                          <Download className="w-3 h-3" /> Download Error Report
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Final Action */}
                <div className="mt-0 pt-4 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={handleImport}
                    disabled={!file || isImporting}
                    className="flex items-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all transform active:scale-95"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" /> Processing...
                      </>
                    ) : (
                      <>
                        Start Import <ChevronRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: Sidebar (Span 4) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="lg:sticky lg:top-24 space-y-6">

              {/* Instructions Card */}
              <div className="bg-amber-50 rounded-2xl border border-amber-100 p-6">
                <div className="flex items-center gap-2 mb-4 text-amber-800">
                  <AlertCircle className="w-5 h-5" />
                  <h3 className="font-bold">Important Guidelines</h3>
                </div>
                <ul className="space-y-3">
                  {[
                    "Upload attachments BEFORE importing the CSV.",
                    "Use exact filenames in the CSV column.",
                    "Dates must be DD-MM-YYYY.",
                    "Parent Task IDs must exist for dependent tasks.",
                    "Checklists are comma-separated.",
                    "If Mutiples Users add are comma-separated",
                    "File Size must me less than 2MB."

                  ].map((item, i) => (
                    <li key={i} className="flex gap-3 text-sm text-amber-900/80 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0"></span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Status Summary */}
              {/* <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Session Summary</h3>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-gray-500">Template</span>
                    <span className="font-medium text-gray-900">{templates[selectedTemplate].name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-gray-500">Task File</span>
                    <span className={`font-medium truncate max-w-[140px] ${uploadedFileName ? 'text-green-600' : 'text-gray-400'}`}>
                      {uploadedFileName || 'Not selected'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-gray-500">Attachments</span>
                    <span className="font-medium text-indigo-600">{uploadedAttachmentBackendNames.length} uploaded</span>
                  </div>
                </div>
              </div> */}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportTask;