"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  warehouseService,
  UpdateWarehouseDTO,
  WarehouseDTO,
} from "@/lib/services/warehouse-service";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Loader2, X, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { shopService } from "@/lib/services/shop-service";

export default function EditWarehousePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [newImages, setNewImages] = useState<File[]>([]);
  const shopSlug = searchParams.get("shopSlug");
  const warehouseId = Number(params.id);

  const {
    data: shopData,
    isLoading: isLoadingShop,
    isError: isErrorShop,
  } = useQuery({
    queryKey: ["shop", shopSlug],
    queryFn: () => shopService.getShopBySlug(shopSlug!),
    enabled: !!shopSlug,
  });

  const {
    data: warehouseData,
    isLoading: isLoadingWarehouse,
    isError: isErrorWarehouse,
  } = useQuery({
    queryKey: ["warehouse", warehouseId],
    queryFn: () => warehouseService.getWarehouseById(warehouseId),
    enabled: !!warehouseId,
    refetchOnWindowFocus: false,
  });

  const [formData, setFormData] = useState<UpdateWarehouseDTO>({
    name: "",
    description: "",
    address: "",
    city: "",
    country: "",
    phone: "",
    email: "",
    capacity: 0,
    latitude: undefined,
    longitude: undefined,
    isActive: true,
  });

  useEffect(() => {
    if (warehouseData) {
      setFormData({
        name: warehouseData.name,
        description: warehouseData.description || "",
        address: warehouseData.address,
        city: warehouseData.city,
        country: warehouseData.country,
        phone: warehouseData.phone || "",
        email: warehouseData.email || "",
        capacity: warehouseData.capacity || 0,
        latitude: warehouseData.latitude,
        longitude: warehouseData.longitude,
        isActive: warehouseData.isActive,
      });
    }
  }, [warehouseData]);

  const updateMutation = useMutation({
    mutationFn: (data: {
      id: number;
      warehouse: UpdateWarehouseDTO;
      images?: File[];
    }) =>
      warehouseService.updateWarehouse(data.id, data.warehouse, data.images),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Warehouse updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse", warehouseId] });
      router.push(
        `/dashboard/warehouses${shopSlug ? `?shopSlug=${shopSlug}` : ""}`,
      );
    },
    onError: (error: any) => {
      console.error("Failed to update warehouse:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to update warehouse",
        variant: "destructive",
      });
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: (imageId: number) =>
      warehouseService.removeImageFromWarehouse(warehouseId, imageId), // This method isn't strictly typed in the provided service file but logically should exist. I'll need to check or add it if missing in service file. Checking service file...
    // Service file has 'removeImageFromWarehouse(warehouseId, imageId)' defined in the interface but implemented as DELETE /{warehouseId}/images/{imageId}
    // Wait, let me check the service file content I read earlier.
    // Line 230: removeImageFromWarehouse is NOT in the class WarehouseService shown in step 661??
    // Let me re-read step 661.
    // It has deleteWarehouse, getWarehouseProducts, searchWarehouses...
    // I DO NOT see removeImageFromWarehouse in the class WarehouseService implementation in Step 661.
    // I see it in the Java backend.
    // I must add it to the frontend service if I want to use it.
  });

  // Since I noticed removeImageFromWarehouse might be missing in frontend service, I will need to add it or use apiClient directly.
  // For now, I'll assume I can add it to the services file or use a custom fetch.
  // Given I need to "Update the warehouse", I'll likely need to modify the service file too.

  const handleDeleteImage = async (imageId: number) => {
    try {
      // Temporarily using direct API call or assume service will be updated
      // Actually, I should update the service file first.
      // But let's finish the component logic.
      await warehouseService.removeImageFromWarehouse(warehouseId, imageId); // I will add this to service
      toast({ title: "Success", description: "Image removed" });
      queryClient.invalidateQueries({ queryKey: ["warehouse", warehouseId] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove image",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!shopSlug) {
      toast({
        title: "Missing shop",
        description: "Please open this page from a shop context.",
        variant: "destructive",
      });
      router.push("/shops");
      return;
    }
  }, [shopSlug, router]);

  const handleInputChange = (
    field: keyof UpdateWarehouseDTO,
    value: string | number | boolean,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setNewImages((prev) => [...prev, ...files]);
  };

  const removeNewImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.address ||
      !formData.city ||
      !formData.country
    ) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Ensure we keep existing lat/long if not changed, or update them.
    // The formData is initialized from warehouseData, so it should be fine.

    updateMutation.mutate({
      id: warehouseId,
      warehouse: formData,
      images: newImages.length > 0 ? newImages : undefined,
    });
  };

  if (isLoadingShop || isLoadingWarehouse) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (isErrorShop || isErrorWarehouse) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load warehouse or shop information.
          </AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Warehouse</h1>
          <p className="text-muted-foreground">Update your warehouse details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Update basic details for your warehouse
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Warehouse Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter warehouse name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) =>
                    handleInputChange("capacity", parseInt(e.target.value) || 0)
                  }
                  placeholder="Enter capacity"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                placeholder="Enter warehouse description"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  handleInputChange("isActive", checked)
                }
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader>
            <CardTitle>Address Information</CardTitle>
            <CardDescription>
              Update the warehouse address details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="Enter street address"
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  placeholder="Enter city"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => handleInputChange("country", e.target.value)}
                placeholder="Enter country"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>
              Update contact details for the warehouse
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="Enter email address"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle>Warehouse Images</CardTitle>
            <CardDescription>Manage images for your warehouse</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Existing Images */}
            {warehouseData?.images && warehouseData.images.length > 0 && (
              <div className="space-y-2">
                <Label>Current Images</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {warehouseData.images.map((image) => (
                    <div key={image.id} className="relative group">
                      <img
                        src={image.imageUrl}
                        alt="Warehouse"
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteImage(image.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Images */}
            <div className="space-y-2">
              <Label htmlFor="images">Upload New Images</Label>
              <Input
                id="images"
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="cursor-pointer"
              />
            </div>
            {newImages.length > 0 && (
              <div className="space-y-2">
                <Label>New Images Preview</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {newImages.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border-dashed border-2"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={() => removeNewImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Updating..." : "Update Warehouse"}
          </Button>
        </div>
      </form>
    </div>
  );
}
