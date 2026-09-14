import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const DataPagination = ({
  page = 1,
  limit = 10,
  total = 0,
  totalPages = 1,
  onPageChange,
  onLimitChange,
}) => {
  // if (!total || totalPages <= 1) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const getPages = () => {
    const pages = [];
    const siblingCount = 1; // how many pages around current
    const totalNumbers = siblingCount * 2 + 5; // first + last + current + siblings + 2 dots

    if (totalPages <= totalNumbers) {
      // small number of pages → show all
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    const leftSibling = Math.max(page - siblingCount, 1);
    const rightSibling = Math.min(page + siblingCount, totalPages);

    const showLeftDots = leftSibling > 2;
    const showRightDots = rightSibling < totalPages - 1;

    if (!showLeftDots && showRightDots) {
      // left side no dots
      for (let i = 1; i <= 3 + 2 * siblingCount; i++) {
        pages.push(i);
      }
      pages.push("...");
      pages.push(totalPages);
    } else if (showLeftDots && !showRightDots) {
      pages.push(1);
      pages.push("...");
      for (
        let i = totalPages - (3 + 2 * siblingCount) + 1;
        i <= totalPages;
        i++
      ) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      pages.push("...");
      for (let i = leftSibling; i <= rightSibling; i++) {
        pages.push(i);
      }
      pages.push("...");
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-3 mt-5 border-t pt-4">
      {/* Left: Range + Limit */}
      <div className="flex items-center gap-3 text-sm text-gray-600">
        <span>
          Showing <span className="font-medium">{start}</span>–
          <span className="font-medium">{end}</span> of{" "}
          <span className="font-medium">{total}</span>
        </span>

        {/* Limit Selector */}
        <Select
          value={String(limit)}
          onValueChange={(val) => onLimitChange(Number(val))}
        >
          <SelectTrigger className="w-[80px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[5, 10, 20, 50].map((l) => (
              <SelectItem key={l} value={String(l)}>
                {l} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Right: Pagination Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {getPages().map((p, idx) =>
          p === "..." ? (
            <span key={idx} className="px-2 text-gray-400 text-sm select-none">
              ...
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="sm"
              className="min-w-[36px]"
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          ),
        )}

        <Button
          variant="outline"
          size="icon"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default DataPagination;
