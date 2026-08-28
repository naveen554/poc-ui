import { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string | string[];
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
}

export function Tooltip({ content, children, maxWidth = '300px', className = 'inline-block' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const targetRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && targetRef.current && tooltipRef.current) {
      const targetRect = targetRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      let top = targetRect.bottom + 8;
      let left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
      
      if (left < 8) left = 8;
      if (left + tooltipRect.width > window.innerWidth - 8) {
        left = window.innerWidth - tooltipRect.width - 8;
      }
      
      if (top + tooltipRect.height > window.innerHeight - 8) {
        top = targetRect.top - tooltipRect.height - 8;
      }
      
      setPosition({ top, left });
      setIsPositioned(true);
    } else {
      setIsPositioned(false);
    }
  }, [isVisible]);

  const contentArray = Array.isArray(content) ? content : [content];
  const displayContent = contentArray.filter(item => item && item !== '—');

  if (displayContent.length === 0) {
    return <>{children}</>;
  }

  return (
    <>
      <div
        ref={targetRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className={className}
      >
        {children}
      </div>
      
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-50 pointer-events-none transition-opacity duration-150"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            maxWidth,
            opacity: isPositioned ? 1 : 0
          }}
        >
          <div className="rounded-lg bg-gray-900 px-3 py-2 shadow-xl border border-gray-700">
            <div className="flex flex-col gap-1">
              {displayContent.map((item, index) => (
                <span
                  key={index}
                  className="text-[11px] text-white font-medium whitespace-normal break-words"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div
            className="absolute w-2 h-2 bg-gray-900 border-l border-t border-gray-700 transform rotate-45 -translate-x-1/2"
            style={{
              top: '-4px',
              left: '50%'
            }}
          />
        </div>
      )}
    </>
  );
}
