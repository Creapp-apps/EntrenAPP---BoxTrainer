"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = "Seleccionar opción",
  className,
  triggerClassName,
  disabled = false,
  searchable = false,
  searchPlaceholder = "Buscar...",
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Reset search query when closing
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const filteredOptions = searchable
    ? options.filter((option) =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full text-left", className)}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border border-input bg-card text-foreground text-sm font-medium transition-all duration-200 outline-none select-none",
          "focus:ring-2 focus:ring-primary/20 focus:border-primary",
          "hover:border-primary/50 hover:bg-muted/10",
          disabled && "opacity-50 cursor-not-allowed hover:border-input hover:bg-card",
          isOpen && "border-primary ring-2 ring-primary/20 shadow-md",
          triggerClassName
        )}
      >
        <span className={cn("truncate", !selectedOption && "text-muted-foreground")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-300 shrink-0",
            isOpen && "rotate-180 text-primary"
          )}
        />
      </button>

      {/* Floating Options Menu */}
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 left-0 right-0 mt-2 rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl overflow-hidden animate-scale-in origin-top"
          )}
        >
          {/* Search bar inside Select */}
          {searchable && (
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/20">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm border-none outline-none placeholder:text-muted-foreground"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="p-1 rounded-md hover:bg-muted/60 transition"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-rounded">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-2.5 text-sm text-left font-medium transition-colors hover:bg-muted/70",
                      isSelected && "bg-primary/10 text-primary hover:bg-primary/15"
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary shrink-0 animate-scale-in" />
                    )}
                  </button>
                );
              })
            ) : (
              <p className="px-4 py-3 text-xs text-muted-foreground text-center">
                Sin resultados
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
