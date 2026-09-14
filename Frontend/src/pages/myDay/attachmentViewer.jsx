import { Modal, Button, Checkbox } from "antd";
import { EyeOutlined, DownloadOutlined } from "@ant-design/icons";
import { useState } from "react";

const ViewLink = ({ file, text = "View" }) => {
  const attachments = Array.isArray(file) ? file : [];

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState([]);

  if (!attachments.length) {
    return <span className="text-gray-500 text-xs">NA</span>;
  }

  const getFileUrl = (file) =>
    `${import.meta.env.VITE_API_BASE_URL}/tasks/download?filePath=${encodeURIComponent(file)}`;

  const getType = (file) => {
    const ext = file.split(".").pop().toLowerCase();
    if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
    if (ext === "pdf") return "pdf";
    return "other";
  };

  const toggleSelect = (file) => {
    setSelected((prev) =>
      prev.includes(file) ? prev.filter((f) => f !== file) : [...prev, file],
    );
  };

  const selectAll = () => {
    if (selected.length === attachments.length) {
      setSelected([]);
    } else {
      setSelected(attachments);
    }
  };

  const downloadFiles = async (files) => {
    for (const file of files) {
      try {
        const url = getFileUrl(file);

        const response = await fetch(url);
        const blob = await response.blob();

        const blobUrl = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = file.split("/").pop();

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.URL.revokeObjectURL(blobUrl);

        // 🔥 IMPORTANT DELAY (prevents browser block)
        await new Promise((res) => setTimeout(res, 500));
      } catch (err) {
        console.error("Download failed:", err);
      }
    }
  };
  return (
    <>
      {/* 🔥 ONLY BUTTON */}
      <span
        className={`text-xs cursor-pointer hover:underline flex items-center gap-1 ${
          text ? "text-white-600" : "text-blue-400"
        }`}
        onClick={() => setOpen(true)}
      >
        <EyeOutlined /> {text ?? "View"} ({attachments.length})
      </span>

      {/* 🔥 MODAL */}
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={900}
      >
        {/* HEADER ACTIONS */}
        <div className="flex justify-between items-center mb-4">
          <Checkbox
            checked={selected.length === attachments.length}
            onChange={selectAll}
          >
            Select All
          </Checkbox>

          <div className="flex gap-2 me-5">
            <Button
              disabled={!selected.length}
              onClick={() => downloadFiles(selected)}
            >
              Download Selected
            </Button>

            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => downloadFiles(attachments)}
            >
              Download All
            </Button>
          </div>
        </div>

        {/* FILE GRID */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {attachments.map((file, index) => {
            const type = getType(file);
            const url = getFileUrl(file);

            return (
              <div
                key={index}
                className="border rounded-xl p-2 relative hover:shadow"
              >
                {/* SELECT */}
                <Checkbox
                  className="absolute top-2 left-2 z-10"
                  checked={selected.includes(file)}
                  onChange={() => toggleSelect(file)}
                />

                {/* PREVIEW */}
                {type === "image" && (
                  <img
                    src={url}
                    alt=""
                    className="w-full h-32 object-cover rounded"
                  />
                )}

                {type === "pdf" && (
                  <iframe
                    src={url}
                    title="pdf"
                    className="w-full h-32 rounded"
                  />
                )}

                {type === "other" && (
                  <div className="h-32 flex items-center justify-center bg-gray-100 rounded">
                    <span className="text-xs">No Preview</span>
                  </div>
                )}

                {/* FOOTER */}
                {/* <div className="text-xs mt-2 truncate">
                  {file.split("/").pop()}
                </div> */}

                <Button
                  size="small"
                  className="mt-1 w-full"
                  onClick={() => downloadFiles([file])}
                >
                  Download
                </Button>
              </div>
            );
          })}
        </div>
      </Modal>
    </>
  );
};

export default ViewLink;
