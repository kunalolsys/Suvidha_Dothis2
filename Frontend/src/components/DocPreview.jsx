import { useEffect, useRef, useState } from "react";
import { renderAsync } from "docx-preview";

const DocxViewer = ({ fileUrl }) => {
  const containerRef = useRef();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadDocx = async () => {
      if (!fileUrl) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(fileUrl);

        if (!response.ok) {
          throw new Error("Failed to fetch document");
        }

        const blob = await response.blob();

        if (!isMounted) return;

        // clear old content safely
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
        }

        await renderAsync(blob, containerRef.current);
        if (containerRef.current) {
          const pages = containerRef.current.querySelectorAll(
            "section, .docx-page",
          );

          pages.forEach((page) => {
            const text = page.textContent?.trim();

            const hasImages = page.querySelector("img");
            const hasTables = page.querySelector("table");

            if (!text && !hasImages && !hasTables) {
              page.remove();
            }
          });
        }
      } catch (err) {
        console.error("DOCX render error:", err);
        if (isMounted) {
          setError("Failed to load document");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDocx();

    return () => {
      isMounted = false;
    };
  }, [fileUrl]);

  return (
    <div className="relative w-full h-full bg-gray-50 rounded-md border overflow-hidden">
      {/* 🔄 Loading */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
          <div className="text-sm text-gray-600 animate-pulse">
            Loading document...
          </div>
        </div>
      )}

      {/* ❌ Error */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-red-500 text-sm px-4">
          <p>{error}</p>
        </div>
      )}

      {/* 📄 Doc Content */}
      <div
        ref={containerRef}
        className=" overflow-auto h-full text-sm leading-relaxed"
      />
    </div>
  );
};

export default DocxViewer;
