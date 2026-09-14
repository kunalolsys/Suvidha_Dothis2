import { Upload, Button, Modal } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useState } from "react";

const AttachmentUpload = ({ setFiles, fileList, setFileList }) => {
  // const [fileList, setFileList] = useState([]);
  const [preview, setPreview] = useState({
    visible: false,
    image: "",
  });

  const handleChange = ({ fileList: newFileList }) => {
    setFileList(newFileList);
    setFiles(newFileList.map((file) => file.originFileObj));
  };

  const handlePreview = async (file) => {
    const fileObj = file.originFileObj;
    if (!fileObj) return;

    const fileName = file.name.toLowerCase();

    // IMAGE
    if (fileObj.type.startsWith("image/")) {
      const url = URL.createObjectURL(fileObj);
      setPreview({ visible: true, type: "image", data: url });
    }

    // PDF
    else if (fileObj.type === "application/pdf" || fileName.endsWith(".pdf")) {
      const url = URL.createObjectURL(fileObj);
      setPreview({ visible: true, type: "pdf", data: url });
    }

    // ✅ CSV FIX (extension based)
    else if (fileName.endsWith(".csv")) {
      const text = await fileObj.text();
      setPreview({ visible: true, type: "csv", data: text });
    }

    // TEXT
    else if (fileObj.type === "text/plain") {
      const text = await fileObj.text();
      setPreview({ visible: true, type: "text", data: text });
    } else {
      const url = URL.createObjectURL(fileObj);
      window.open(url);
    }
  };

  return (
    <div className="space-y-2">
      <Upload
        name="attachments" // 🔥 important
        multiple
        listType="picture-card" // ✅ small boxes
        fileList={fileList}
        beforeUpload={() => false}
        onChange={handleChange}
        onPreview={handlePreview}
      >
        <div>
          <UploadOutlined />
          <div style={{ marginTop: 8 }}>Upload</div>
        </div>
      </Upload>

      <Modal
        open={preview.visible}
        footer={null}
        onCancel={() => setPreview({ visible: false })}
        width={800}
      >
        {preview.type === "image" && (
          <img src={preview.data} style={{ width: "100%" }} />
        )}

        {preview.type === "pdf" && (
          <iframe
            src={preview.data}
            width="100%"
            height="500px"
            title="PDF Preview"
          />
        )}

        {preview.type === "text" && (
          <pre style={{ maxHeight: "500px", overflow: "auto" }}>
            {preview.data}
          </pre>
        )}

        {preview.type === "excel" && (
          <div>
            <p>Excel preview not fully supported</p>
            <p>File: {preview.data}</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AttachmentUpload;
