import { useEffect, useRef, useState } from "react";

export function useScrollManager() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  };

  const handleScroll = () => {
    if (containerRef.current) {
      setShowScrollTop(containerRef.current.scrollTop > 200);
    }
  };

  useEffect(() => {
    const containerElement = containerRef.current;
    if (containerElement) {
      containerElement.addEventListener("scroll", handleScroll);
      return () => containerElement.removeEventListener("scroll", handleScroll);
    }
  }, []);

  return {
    containerRef,
    showScrollTop,
    scrollToTop,
  };
}
