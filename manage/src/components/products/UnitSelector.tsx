"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { unitService, UnitsPageResponse } from "@/lib/services/unit-service";
import { UnitOption } from "@/lib/services/product-service";
import { ChevronDown, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 15;

interface UnitSelectorProps {
  value: number | undefined | null;
  selectedUnit: UnitOption | null;
  onChange: (unitId: number | undefined, unit: UnitOption | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function UnitSelector({
  value,
  selectedUnit,
  onChange,
  placeholder = "Select unit (e.g. kg, pc)",
  className,
  disabled,
}: UnitSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [data, setData] = useState<UnitsPageResponse | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [newName, setNewName] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const fetchUnits = useCallback(
    async (pageNum: number, searchQ: string, append: boolean) => {
      setLoading(true);
      try {
        const res = await unitService.getUnits({
          page: pageNum,
          size: PAGE_SIZE,
          search: searchQ || undefined,
        });
        setData((prev) =>
          append && prev
            ? {
                ...res,
                content: [...prev.content, ...res.content],
              }
            : res
        );
        setPage(pageNum);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (open) {
      setSearchInput("");
      fetchUnits(0, "", false);
    }
  }, [open, fetchUnits]);

  const handleSearch = () => {
    fetchUnits(0, searchInput.trim(), false);
  };

  const handleLoadMore = () => {
    if (!data || (data.content.length >= data.totalElements)) return;
    fetchUnits(page + 1, searchInput.trim(), true);
  };

  const handleSelect = (unit: UnitOption) => {
    onChange(unit.id, unit);
    setOpen(false);
  };

  const handleCreateNew = () => {
    setNewSymbol(searchInput.trim() || "");
    setNewName(searchInput.trim() || "");
    setCreateDialogOpen(true);
  };

  const handleCreateSubmit = async () => {
    if (!newSymbol.trim() || !newName.trim()) return;
    setCreateSubmitting(true);
    try {
      const unit = await unitService.createUnit(newSymbol.trim(), newName.trim());
      onChange(unit.id, unit);
      setCreateDialogOpen(false);
      setOpen(false);
      setNewSymbol("");
      setNewName("");
      fetchUnits(0, "", false);
    } finally {
      setCreateSubmitting(false);
    }
  };

  const showCreateButton =
    searchInput.trim() &&
    data &&
    data.content.length === 0 &&
    !loading;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal border-primary/20",
              !selectedUnit && "text-muted-foreground",
              className
            )}
          >
            {selectedUnit
              ? `${selectedUnit.symbol} (${selectedUnit.name})`
              : placeholder}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="p-2 border-b">
            <div className="flex gap-2">
              <Input
                placeholder="Search units..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="h-9"
              />
              <Button type="button" size="sm" onClick={handleSearch}>
                Search
              </Button>
            </div>
          </div>
          <ScrollArea className="h-[240px]">
            {loading && !data?.content.length ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="p-1">
                {data?.content.map((unit) => (
                  <button
                    key={unit.id}
                    type="button"
                    className={cn(
                      "w-full text-left px-2 py-2 rounded hover:bg-accent flex justify-between items-center",
                      value === unit.id && "bg-accent"
                    )}
                    onClick={() => handleSelect(unit)}
                  >
                    <span className="font-medium">{unit.symbol}</span>
                    <span className="text-muted-foreground text-sm">{unit.name}</span>
                  </button>
                ))}
                {showCreateButton && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start gap-2 mt-1"
                    onClick={handleCreateNew}
                  >
                    <Plus className="h-4 w-4" />
                    Create new unit &quot;{searchInput.trim()}&quot;
                  </Button>
                )}
                {data && data.content.length < data.totalElements && !showCreateButton && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={handleLoadMore}
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Load more"}
                  </Button>
                )}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new unit</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="unit-symbol">Symbol (e.g. kg, pc)</Label>
              <Input
                id="unit-symbol"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                placeholder="kg"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unit-name">Name</Label>
              <Input
                id="unit-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Kilogram"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={createSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSubmit}
              disabled={!newSymbol.trim() || !newName.trim() || createSubmitting}
            >
              {createSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
