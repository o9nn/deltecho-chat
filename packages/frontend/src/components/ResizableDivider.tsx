import React, { useCallback, useRef, useEffect } from "react";

interface ResizableDividerProps {
  /** Direction of the divider */
  direction?: "vertical" | "horizontal";
  /** Callback when the divider is dragged, receives delta in pixels */
  onResize: (delta: number) => void;
  /** Callback when drag starts */
  onResizeStart?: () => void;
  /** Callback when drag ends */
  onResizeEnd?: () => void;
  /** Custom class name */
  className?: string;
}

/**
 * A draggable divider that sits between two panels.
 * Fires onResize(delta) during drag with the pixel offset from the drag start.
 */
export const ResizableDivider: React.FC<ResizableDividerProps> = ({
  direction = "vertical",
  onResize,
  onResizeStart,
  onResizeEnd,
  className = "",
}) => {
  const isDragging = useRef(false);
  const startPos = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isDragging.current = true;
      startPos.current = direction === "vertical" ? e.clientX : e.clientY;
      document.body.style.cursor =
        direction === "vertical" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
      onResizeStart?.();
    },
    [direction, onResizeStart],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const currentPos = direction === "vertical" ? e.clientX : e.clientY;
      const delta = currentPos - startPos.current;
      startPos.current = currentPos;
      onResize(delta);
    };

    const handleMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      onResizeEnd?.();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [direction, onResize, onResizeEnd]);

  return (
    <div
      className={`resizable-divider resizable-divider--${direction} ${className}`}
      onMouseDown={handleMouseDown}
      role="separator"
      aria-orientation={direction}
    />
  );
};

export default ResizableDivider;
