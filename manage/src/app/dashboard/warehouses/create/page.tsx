"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  warehouseService,
  CreateWarehouseDTO,
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
import { ArrowLeft, Upload, X, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { shopService } from "@/lib/services/shop-service";
import { GoogleMapsAddressPicker } from "@/components/GoogleMapsWarehousePicker";

export default function CreateWarehousePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [images, setImages] = useState<File[]>([]);
  const shopSlug = searchParams.get("shopSlug");

  const {
    data: shopData,
    isLoading: isLoadingShop,
    isError: isErrorShop,
  } = useQuery({
    queryKey: ["shop", shopSlug],
    queryFn: () => shopService.getShopBySlug(shopSlug!),
    enabled: !!shopSlug,
  });

  const shopId = shopData?.shopId;
  const [formData, setFormData] = useState<CreateWarehouseDTO>({
    name: "",
    description: "",
    address: "",
    city: "",
    country: "",
    phone: "",
    email: "",
    capacity: 1000,
    latitude: undefined,
    longitude: undefined,
    isActive: true,
  });

  const createMutation = useMutation({
    mutationFn: (data: { warehouse: CreateWarehouseDTO; images?: File[] }) =>
      warehouseService.createWarehouse(data.warehouse, data.images),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Warehouse created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      router.push(
        `/dashboard/warehouses${shopSlug ? `?shopSlug=${shopSlug}` : ""}`,
      );
    },
    onError: (error: any) => {
      // Error is handled globally in api-client.ts
      console.error("Failed to create warehouse:", error);
    },
  });

  useEffect(() => {
    // Warehouses are shop-scoped for vendor/employee flows; ensure shopSlug is present.
    if (!shopSlug) {
      toast({
        title: "Missing shop",
        description: "Please open this page from a shop context.",
        variant: "destructive",
      });
      router.push("/shops");
      return;
    }

    if (isErrorShop || (!isLoadingShop && !shopData)) {
      toast({
        title: "Shop not found",
        description: "Redirecting to shops page.",
        variant: "destructive",
      });
      router.push("/shops");
    }
  }, [shopSlug, isLoadingShop, isErrorShop, shopData, router]);

  const handleInputChange = (
    field: keyof CreateWarehouseDTO,
    value: string | number | boolean,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setImages((prev) => [...prev, ...files]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!shopId) {
      toast({
        title: "Please wait",
        description: "Shop information is still loading.",
        variant: "default",
      });
      return;
    }

    // Basic validation
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

    // Google Maps is disabled (API key expired). Mock a stable static location if none was provided.
    // You can change these to your preferred default coordinates.
    const mockedLatitude =
      typeof formData.latitude === "number" ? formData.latitude : -1.9441;
    const mockedLongitude =
      typeof formData.longitude === "number" ? formData.longitude : 30.0619;

    createMutation.mutate({
      warehouse: {
        ...formData,
        shopId,
        latitude: mockedLatitude,
        longitude: mockedLongitude,
      },
      images: images.length > 0 ? images : undefined,
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Create Warehouse
          </h1>
          <p className="text-muted-foreground">
            Add a new warehouse to your inventory management system
          </p>
        </div>
      </div>

      {isLoadingShop && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Loading shop information…</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Provide the basic details for your warehouse
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
              Enter the warehouse address details
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
              Provide contact details for the warehouse
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

        {/* Google Maps picker intentionally disabled (API key expired). */}
        <Card>
          <CardHeader>
            <CardTitle>Address Picker</CardTitle>
            <CardDescription>
              Use the interactive map to search and pick the warehouse location.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
              <GoogleMapsAddressPicker
                apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                onAddressSelect={(addr) => {
                  setFormData((prev) => ({
                    ...prev,
                    address: addr.formattedAddress || prev.address,
                    city: addr.city || prev.city,
                    country: addr.country || prev.country,
                    latitude: addr.latitude,
                    longitude: addr.longitude,
                  }));
                }}
              />
            ) : (
              <CardContent className="p-6">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {/* Google Maps is not configured. We’ll use a mocked
                    latitude/longitude on create if none is set. */}
                    Using default location data
                  </AlertDescription>
                </Alert>
              </CardContent>
            )}
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle>Warehouse Images</CardTitle>
            <CardDescription>
              Upload images of your warehouse (optional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="images">Upload Images</Label>
              <Input
                id="images"
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="cursor-pointer"
              />
            </div>
            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {images.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(image)}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create Warehouse"}
          </Button>
        </div>
      </form>
    </div>
  );
}
