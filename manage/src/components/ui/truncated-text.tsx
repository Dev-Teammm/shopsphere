"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TruncatedTextProps {
  text: string;
  maxLength?: number;
  className?: string;
  showCopyButton?: boolean;
}

export function TruncatedText({
  text,
  maxLength = 8,
  className = "",
  showCopyButton = true,
}: TruncatedTextProps) {
  const [copied, setCopied] = useState(false);

  const truncatedText =
    text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  if (!showCopyButton) {
    return (
      <span className={cn("font-mono text-sm", className)} title={text}>
        {truncatedText}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 group">
      <span
        className={cn("font-mono text-sm cursor-pointer", className)}
        title={text}
        onClick={handleCopy}
      >
        {truncatedText}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-600" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}
