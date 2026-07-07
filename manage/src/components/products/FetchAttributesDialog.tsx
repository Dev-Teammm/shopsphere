"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, Check, X } from "lucide-react";
import {
  attributeService,
  ProductAttributeTypeDTO,
  ProductAttributeValueDTO,
} from "@/lib/services/attribute-service";
import { useToast } from "@/hooks/use-toast";

interface FetchAttributesDialogProps {
  onAttributesSelected: (
    attributes: Array<{ name: string; values: string[] }>
  ) => void;
}

export default function FetchAttributesDialog({
  onAttributesSelected,
}: FetchAttributesDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [attributeTypes, setAttributeTypes] = useState<
    ProductAttributeTypeDTO[]
  >([]);
  const [selectedAttributes, setSelectedAttributes] = useState<
    Map<string, Set<string>>
  >(new Map());
  const [attributeValues, setAttributeValues] = useState<
    Map<number, ProductAttributeValueDTO[]>
  >(new Map());
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchAttributeTypes();
    }
  }, [open, currentPage, searchTerm]);

  const fetchAttributeTypes = async () => {
    try {
      setLoading(true);
      const response = await attributeService.getAllAttributeTypes(
        currentPage,
        10,
        "name",
        "ASC"
      );
      setAttributeTypes(response.content);
      setTotalPages(response.totalPages);

      // Fetch values for each attribute type
      for (const attrType of response.content) {
        if (!attributeValues.has(attrType.attributeTypeId)) {
          try {
            const values = await attributeService.getAttributeValuesByType(
              attrType.attributeTypeId
            );
            setAttributeValues((prev) =>
              new Map(prev).set(attrType.attributeTypeId, values)
            );
          } catch (error) {
            console.error(
              `Failed to fetch values for ${attrType.name}:`,
              error
            );
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch attribute types:", error);
      toast({
        title: "Error",
        description: "Failed to fetch attribute types. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAttributeToggle = (
    attributeType: ProductAttributeTypeDTO,
    checked: boolean
  ) => {
    if (checked) {
      setSelectedAttributes((prev) => {
        const newMap = new Map(prev);
        newMap.set(attributeType.name, new Set());
        return newMap;
      });
    } else {
      setSelectedAttributes((prev) => {
        const newMap = new Map(prev);
        newMap.delete(attributeType.name);
        return newMap;
      });
    }
  };

  const handleValueToggle = (
    attributeName: string,
    value: string,
    checked: boolean
  ) => {
    setSelectedAttributes((prev) => {
      const newMap = new Map(prev);
      const values = newMap.get(attributeName) || new Set();

      if (checked) {
        values.add(value);
      } else {
        values.delete(value);
      }

      newMap.set(attributeName, values);
      return newMap;
    });
  };

  const handleConfirm = () => {
    const selectedAttributesArray = Array.from(selectedAttributes.entries())
      .filter(([_, values]) => values.size > 0)
      .map(([name, values]) => ({
        name,
        values: Array.from(values),
      }));

    if (selectedAttributesArray.length === 0) {
      toast({
        title: "No attributes selected",
        description: "Please select at least one attribute and its values.",
        variant: "destructive",
      });
      return;
    }

    onAttributesSelected(selectedAttributesArray);
    setOpen(false);
    setSelectedAttributes(new Map());
  };

  const handleCancel = () => {
    setOpen(false);
    setSelectedAttributes(new Map());
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Fetch from saved attributes
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select Product Attributes</DialogTitle>
          <DialogDescription>
            Choose attributes and their values from the existing ones in the
            system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search attributes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Attributes List */}
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">
                    Loading attributes...
                  </p>
                </div>
              ) : (
                attributeTypes
                  .filter((attr) =>
                    attr.name.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((attributeType) => {
                    const isSelected = selectedAttributes.has(
                      attributeType.name
                    );
                    const values =
                      attributeValues.get(attributeType.attributeTypeId) || [];
                    const selectedValues =
                      selectedAttributes.get(attributeType.name) || new Set();

                    return (
                      <div
                        key={attributeType.attributeTypeId}
                        className="border rounded-md p-4"
                      >
                        <div className="flex items-center space-x-3 mb-3">
                          <Checkbox
                            id={`attr-${attributeType.attributeTypeId}`}
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              handleAttributeToggle(
                                attributeType,
                                checked as boolean
                              )
                            }
                          />
                          <Label
                            htmlFor={`attr-${attributeType.attributeTypeId}`}
                            className="font-medium cursor-pointer"
                          >
                            {attributeType.name}
                          </Label>
                          {attributeType.isRequired && (
                            <Badge variant="secondary" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </div>

                        {isSelected && (
                          <div className="ml-6 space-y-2">
                            <Label className="text-sm text-muted-foreground">
                              Select values:
                            </Label>
                            <div className="flex flex-wrap gap-2">
                              {values.map((value) => (
                                <div
                                  key={value.attributeValueId}
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox
                                    id={`value-${value.attributeValueId}`}
                                    checked={selectedValues.has(value.value)}
                                    onCheckedChange={(checked) =>
                                      handleValueToggle(
                                        attributeType.name,
                                        value.value,
                                        checked as boolean
                                      )
                                    }
                                  />
                                  <Label
                                    htmlFor={`value-${value.attributeValueId}`}
                                    className="text-sm cursor-pointer"
                                  >
                                    {value.value}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          </ScrollArea>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))
                }
                disabled={currentPage === totalPages - 1}
              >
                Next
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Confirm Selection</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
