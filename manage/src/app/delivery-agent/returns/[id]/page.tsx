"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Package,
  Calendar,
  Clock,
  User,
  XCircle,
  RotateCcw,
  Image as ImageIcon,
  ExternalLink,
  Loader2,
  CheckCircle,
  Truck,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import {
  deliveryAgentReturnsService,
  DeliveryAgentReturnDetails,
  DeliveryStatus,
} from "@/lib/services/delivery-agent-returns-service";
import {
  returnPickupService,
  ReturnPickupRequest,
  ReturnItemPickup,
  ReturnItemPickupStatus,
} from "@/lib/services/return-pickup-service";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ReturnRequestDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const returnRequestId = params.id as string;

  // Pickup state management
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [pickupItems, setPickupItems] = useState<{[key: number]: ReturnItemPickupStatus}>({});

  // Pickup mutation
  const pickupMutation = useMutation({
    mutationFn: (pickupRequest: ReturnPickupRequest) => 
      returnPickupService.processReturnPickup(pickupRequest),
    onSuccess: (response) => {
      toast.success("Return pickup completed successfully!");
      setShowPickupModal(false);
      queryClient.invalidateQueries({ queryKey: ["delivery-agent-return-details", returnRequestId] });
      // Optionally navigate back to returns list
      // router.push("/delivery-agent/returns");
    },
    onError: (error: any) => {
      console.error("Pickup error:", error);
      let errorMessage = "Failed to process pickup";
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      }
      
      toast.error(errorMessage);
    }
  });

  // Handle pickup initiation
  const handleStartPickup = () => {
    if (!returnDetails?.returnItems) return;
    
    // Initialize pickup items with default status
    const initialPickupItems: {[key: number]: ReturnItemPickupStatus} = {};
    returnDetails.returnItems.forEach(item => {
      initialPickupItems[item.id] = ReturnItemPickupStatus.UNDAMAGED;
    });
    setPickupItems(initialPickupItems);
    setShowPickupModal(true);
  };

  // Handle pickup status change for an item
  const handlePickupStatusChange = (itemId: number, status: ReturnItemPickupStatus) => {
    setPickupItems(prev => ({
      ...prev,
      [itemId]: status
    }));
  };

  // Handle pickup submission
  const handleSubmitPickup = () => {
    if (!returnDetails?.returnItems) return;

    const returnItems: ReturnItemPickup[] = returnDetails.returnItems.map(item => ({
      returnItemId: item.id,
      pickupStatus: pickupItems[item.id] || ReturnItemPickupStatus.UNDAMAGED,
      notes: undefined
    }));

    const pickupRequest: ReturnPickupRequest = {
      returnRequestId: parseInt(returnRequestId),
      returnItems
    };

    pickupMutation.mutate(pickupRequest);
  };

  // Fetch return request details
  const {
    data: returnDetails,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["delivery-agent-return-details", returnRequestId],
    queryFn: () => deliveryAgentReturnsService.getReturnRequestDetails(returnRequestId),
    enabled: !!returnRequestId,
  });


  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !returnDetails) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 mb-4">Failed to load return request details</p>
          <Button onClick={() => refetch()}>Try Again</Button>
        </div>
      </div>
    );
  }

  const returnStatusInfo = deliveryAgentReturnsService.getReturnStatusInfo(returnDetails.status);
  const deliveryStatusInfo = deliveryAgentReturnsService.getDeliveryStatusInfo(returnDetails.deliveryStatus);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Return Request #{returnDetails.id}</h1>
            <p className="text-muted-foreground">
              Order {returnDetails.orderNumber} • {formatDate(returnDetails.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn("text-sm", returnStatusInfo.color)}>
            {returnStatusInfo.label}
          </Badge>
          <Badge className={cn("text-sm", deliveryStatusInfo.color)}>
       {deliveryStatusInfo.label}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Name</Label>
              <p className="text-sm text-muted-foreground">{returnDetails.customer?.name || "Not available"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Email</Label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{returnDetails.customer?.email || "Not available"}</p>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Phone</Label>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{returnDetails.customer?.phone || "Not available"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Order Number</Label>
              <p className="text-sm text-muted-foreground">{returnDetails.orderNumber}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Order Date</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{formatDate(returnDetails.orderDate)}</p>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Order Total</Label>
              <p className="text-sm text-muted-foreground">{formatCurrency(returnDetails.orderTotal)}</p>
            </div>
            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/delivery-agent/orders/${returnDetails.orderId}`)}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View Parent Order
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pickup Address - Full Width Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Pickup Address & Location
          </CardTitle>
          <CardDescription>
            Location where the return items need to be collected
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Address Details */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Full Address</Label>
                <p className="text-sm text-muted-foreground">
                  {returnDetails.pickupAddress?.fullAddress || "Address not available"}
                </p>
              </div>
              {returnDetails.pickupAddress?.latitude && returnDetails.pickupAddress?.longitude && (
                <div>
                  <Label className="text-sm font-medium">GPS Coordinates</Label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground font-mono">
                      {returnDetails.pickupAddress.latitude.toFixed(6)}, {returnDetails.pickupAddress.longitude.toFixed(6)}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url = `https://www.google.com/maps?q=${returnDetails.pickupAddress.latitude},${returnDetails.pickupAddress.longitude}`;
                        window.open(url, '_blank');
                      }}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View on Map
                    </Button>
                  </div>
                </div>
              )}
              {returnDetails.pickupAddress?.latitude && returnDetails.pickupAddress?.longitude && (
                <div className="pt-4">
                  <Button
                    className="w-full"
                    onClick={() => {
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${returnDetails.pickupAddress.latitude},${returnDetails.pickupAddress.longitude}`;
                      window.open(url, '_blank');
                    }}
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    Get Directions
                  </Button>
                </div>
              )}
            </div>

            {/* Google Maps Embed */}
            {returnDetails.pickupAddress?.latitude && returnDetails.pickupAddress?.longitude && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Location Map</Label>
                <div className="aspect-video rounded-md overflow-hidden border">
                  <iframe
                    src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'}&q=${returnDetails.pickupAddress.latitude},${returnDetails.pickupAddress.longitude}&zoom=15`}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Return Reason */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Return Reason
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{returnDetails.reason}</p>
          {returnDetails.decisionNotes && (
            <div className="mt-4 p-4 bg-muted rounded-md">
              <Label className="text-sm font-medium">Admin Notes</Label>
              <p className="text-sm text-muted-foreground mt-1">{returnDetails.decisionNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Return Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Return Items ({returnDetails.returnItems?.length || 0})
          </CardTitle>
          <CardDescription>
            Items to be picked up for return
          </CardDescription>
        </CardHeader>
        <CardContent>
          {returnDetails.returnItems && returnDetails.returnItems.length > 0 ? (
            <div className="space-y-6">
              {returnDetails.returnItems.map((item, index) => (
              <div key={item.id} className="border rounded-md p-4">
                <div className="flex gap-4">
                  {/* Product Images Gallery - Show all images */}
                  <div className="flex-shrink-0">
                    {(() => {
                      // Use variant images if available, otherwise use product images
                      const imageUrls = (item.variant?.variantImageUrls?.length || 0) > 0 
                        ? item.variant?.variantImageUrls || []
                        : item.product?.imageUrls || [];
                      
                      return imageUrls.length > 0 ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            {imageUrls.slice(0, 4).map((url, imgIndex) => (
                              <div key={imgIndex} className="relative">
                                <img
                                  src={url}
                                  alt={`${item.product?.name || "Product"} - Image ${imgIndex + 1}`}
                                  className="w-16 h-16 object-cover rounded-md border hover:scale-105 transition-transform cursor-pointer"
                                  onClick={() => window.open(url, '_blank')}
                                />
                                {imgIndex === 3 && imageUrls.length > 4 && (
                                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-md flex items-center justify-center">
                                    <span className="text-white text-xs font-medium">
                                      +{imageUrls.length - 4}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          {imageUrls.length > 0 && (
                            <p className="text-xs text-muted-foreground text-center">
                              {imageUrls.length} image{imageUrls.length > 1 ? 's' : ''} • Click to view
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="w-20 h-20 bg-muted rounded-md border flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      );
                    })()}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{item.product?.name || "Product name not available"}</h4>
                        {item.product?.brand && (
                          <p className="text-sm text-muted-foreground">Brand: {item.product.brand}</p>
                        )}
                        {item.product?.category && (
                          <p className="text-sm text-muted-foreground">Category: {item.product.category}</p>
                        )}
                      </div>
                      <div className="text-right space-y-2">
                        <Badge variant={item.returnable ? "default" : "destructive"}>
                          {item.returnable ? "Returnable" : "Non-returnable"}
                        </Badge>
                        {item.returnable && item.product?.returnWindowDays && (
                          <div className="text-xs">
                            {(() => {
                              const orderDate = new Date(returnDetails.orderDate);
                              const today = new Date();
                              const daysSinceOrder = Math.floor((today.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
                              const remainingDays = (item.product.returnWindowDays || 30) - daysSinceOrder;
                              
                              return remainingDays > 0 ? (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  remainingDays <= 3 ? 'bg-red-100 text-red-800' :
                                  remainingDays <= 7 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {remainingDays} days left
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Return period expired
                                </span>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Variant Information */}
                    {item.variant && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        {item.variant.color && (
                          <div>
                            <span className="font-medium">Color:</span> {item.variant.color}
                          </div>
                        )}
                        {item.variant.size && (
                          <div>
                            <span className="font-medium">Size:</span> {item.variant.size}
                          </div>
                        )}
                        {item.variant.material && (
                          <div>
                            <span className="font-medium">Material:</span> {item.variant.material}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Price:</span> {formatCurrency(item.variant.variantPrice)}
                        </div>
                      </div>
                    )}

                    {/* Quantity and Pricing */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Return Qty:</span> {item.returnQuantity}
                      </div>
                      <div>
                        <span className="font-medium">Order Qty:</span> {item.orderQuantity}
                      </div>
                      <div>
                        <span className="font-medium">Unit Price:</span> {formatCurrency(item.unitPrice)}
                      </div>
                      <div>
                        <span className="font-medium">Total:</span> {formatCurrency(item.totalPrice)}
                      </div>
                    </div>

                    {/* Item Reason */}
                    {item.itemReason && (
                      <div className="mt-3 p-3 bg-muted rounded-md">
                        <Label className="text-sm font-medium">Item-specific reason:</Label>
                        <p className="text-sm text-muted-foreground mt-1">{item.itemReason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No return items found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pickup Actions */}
      {returnDetails && returnDetails.status === "APPROVED" && returnDetails.deliveryStatus === "ASSIGNED" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Pickup Actions
            </CardTitle>
            <CardDescription>
              Process the pickup of returned items
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleStartPickup}
              disabled={pickupMutation.isPending}
              className="w-full"
              size="lg"
            >
              {pickupMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Pickup...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Start Pickup Process
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pickup Modal */}
      <Dialog open={showPickupModal} onOpenChange={setShowPickupModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Process Return Pickup</DialogTitle>
            <DialogDescription>
              Inspect each item and select its condition for proper inventory handling
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {returnDetails?.returnItems?.map((item, index) => (
              <Card key={item.id} className="p-4">
                <div className="flex gap-4">
                  {/* Product Images */}
                  <div className="flex-shrink-0">
                    {(() => {
                      const imageUrls = (item.variant?.variantImageUrls?.length || 0) > 0 
                        ? item.variant?.variantImageUrls || []
                        : item.product?.imageUrls || [];
                      
                      return imageUrls.length > 0 ? (
                        <img
                          src={imageUrls[0]}
                          alt={item.product?.name || "Product"}
                          className="w-20 h-20 object-cover rounded-md border"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-muted rounded-md border flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      );
                    })()}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 space-y-3">
                    <div>
                      <h4 className="font-semibold">{item.product?.name || "Product name not available"}</h4>
                      {item.variant && (
                        <p className="text-sm text-muted-foreground">{item.variant.variantName}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Quantity to pickup: <span className="font-medium">{item.returnQuantity}</span>
                      </p>
                    </div>

                    {/* Pickup Status Selection */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Item Condition:</Label>
                      <Select
                        value={pickupItems[item.id] || ReturnItemPickupStatus.UNDAMAGED}
                        onValueChange={(value) => handlePickupStatusChange(item.id, value as ReturnItemPickupStatus)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {returnPickupService.getPickupStatusOptions().map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${option.color.replace('bg-', 'bg-').replace('text-', 'border-')}`} />
                                <div>
                                  <div className="font-medium">{option.label}</div>
                                  <div className="text-xs text-muted-foreground">{option.description}</div>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPickupModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitPickup}
              disabled={pickupMutation.isPending}
            >
              {pickupMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Complete Pickup
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pickup Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pickup Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div>
                <p className="font-medium">Assigned</p>
                <p className="text-sm text-muted-foreground">{formatDate(returnDetails.assignedAt)}</p>
              </div>
            </div>
            {returnDetails.pickupScheduledAt && (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <div>
                  <p className="font-medium">Pickup Scheduled</p>
                  <p className="text-sm text-muted-foreground">{formatDate(returnDetails.pickupScheduledAt)}</p>
                </div>
              </div>
            )}
            {returnDetails.pickupStartedAt && (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <div>
                  <p className="font-medium">Pickup Started</p>
                  <p className="text-sm text-muted-foreground">{formatDate(returnDetails.pickupStartedAt)}</p>
                </div>
              </div>
            )}
            {returnDetails.pickupCompletedAt && (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <p className="font-medium">Pickup Completed</p>
                  <p className="text-sm text-muted-foreground">{formatDate(returnDetails.pickupCompletedAt)}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
