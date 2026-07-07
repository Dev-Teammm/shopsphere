"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  CreditCard,
  Package,
  User,
  FileText,
  Edit3,
  Check,
  X,
  Truck,
  ExternalLink,
  RotateCcw,
  Eye,
  Gift,
  QrCode,
  Camera,
  AlertCircle,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { orderService } from "@/lib/services/order-service";
import { userService, UserDTO } from "@/lib/services/user-service";
import {
  AdminOrderDTO,
  OrderStatus,
  OrderPaymentStatus,
} from "@/lib/types/order";
import returnService from "@/services/returnService";
import { ReturnRequestDTO } from "@/types/return";
import { toast } from "sonner";
import { format } from "date-fns";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useQuery } from "@tanstack/react-query";
import { shopService } from "@/lib/services/shop-service";
import QRScannerModal from "@/components/QRScannerModal";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function OrderDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [order, setOrder] = useState<AdminOrderDTO | null>(null);
  const [loading, setLoading] = useState(true);

  // Status update state
  const [statusUpdateOpen, setStatusUpdateOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [updating, setUpdating] = useState(false);

  // Delivery assignment state
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [deliveryAgents, setDeliveryAgents] = useState<UserDTO[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<UserDTO[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [agentSearchTerm, setAgentSearchTerm] = useState("");
  const [mapType, setMapType] = useState<
    "satellite" | "roadmap" | "hybrid" | "terrain"
  >("satellite");

  // Returns associated with this order
  const [orderReturns, setOrderReturns] = useState<ReturnRequestDTO[]>([]);
  const [loadingReturns, setLoadingReturns] = useState(false);

  // QR Scanner state for pickup orders
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isVerifyingPickup, setIsVerifyingPickup] = useState(false);
  const [pickupVerificationError, setPickupVerificationError] = useState<string | null>(null);
  const [pickupVerificationResult, setPickupVerificationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const orderId = params.id as string;
  const shopSlug = searchParams.get("shopSlug");

  // Fetch shop data to get shopId
  const { 
    data: shopData, 
    isLoading: shopLoading, 
    error: shopError 
  } = useQuery({
    queryKey: ["shop", shopSlug],
    queryFn: () => shopService.getShopBySlug(shopSlug!),
    enabled: !!shopSlug,
  });

  const shopId = shopData?.shopId;

  // Redirect if shopSlug is provided but shop fetch failed
  useEffect(() => {
    if (shopSlug && !shopLoading && (shopError || !shopData)) {
      // Shop not found or error fetching shop, redirect to shops page
      router.replace("/shops");
    }
  }, [shopSlug, shopLoading, shopError, shopData, router]);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        // Pass shopId to fetch shop-specific order details
        // If shopSlug exists but shopId is still loading, fetch without shopId first
        // The backend will handle it appropriately
        const orderData = await orderService.getOrderById(
          orderId,
          undefined,
          shopId || undefined
        );
        setOrder(orderData);
      } catch (error) {
        console.error("Error fetching order:", error);
        toast.error("Failed to load order details. Please try again.");
        // If error is due to shop access or order not found, redirect back to orders list
        if (error && typeof error === 'object' && 'response' in error) {
          const httpError = error as any;
          if (httpError.response?.status === 403 || httpError.response?.status === 404) {
            if (shopSlug) {
              router.push(`/dashboard/orders?shopSlug=${shopSlug}`);
            } else {
              router.push("/shops");
            }
          }
        }
      } finally {
        setLoading(false);
      }
    };

    // Fetch order if:
    // 1. orderId exists AND
    // 2. (no shopSlug required OR shopSlug exists and shop query has completed - either success or error)
    if (orderId) {
      if (!shopSlug) {
        // No shopSlug, fetch immediately
        fetchOrder();
      } else if (!shopLoading) {
        // shopSlug exists and shop query has completed
        // Only fetch if shop was found successfully (shopId exists)
        // If shopError exists, the redirect useEffect will handle it
        if (shopId) {
          fetchOrder();
        }
      }
      // If shopLoading is true, wait for it to complete
    }
  }, [orderId, shopId, shopSlug, shopLoading, router]);

  // Fetch returns associated with this order by order number
  useEffect(() => {
    const fetchReturns = async () => {
      if (!order?.orderNumber) return;
      // Don't fetch if shopSlug exists but shopId is still loading
      if (shopSlug && shopLoading) return;
      try {
        setLoadingReturns(true);
        // Use admin returns list with search filter, then filter exactly by orderNumber
        // Pass shopId if available (required for VENDORs)
        const resp = await returnService.getAllReturnRequests({
          page: 0,
          size: 50,
          sort: "submittedAt",
          direction: "DESC",
          filters: { 
            search: order.orderNumber,
            shopId: shopId || undefined,
          },
        });
        const matches = (resp.content || []).filter(
          (r) => r.orderNumber === order.orderNumber
        );
        setOrderReturns(matches);
      } catch (e) {
        console.error("Error fetching order returns:", e);
        setOrderReturns([]);
      } finally {
        setLoadingReturns(false);
      }
    };

    fetchReturns();
  }, [order?.orderNumber, shopId, shopSlug, shopLoading]);

  const displayData = useMemo(() => {
    if (!order) return null;

    // If shopSlug is present, the items and totals in the order object
    // should already be filtered by the backend if shopId was passed.
    // However, if there are multiple shopOrders, we might want the specific one's code.
    const shopOrder =
      shopSlug && order.shopOrders && order.shopOrders.length > 0
        ? order.shopOrders.find(
            (so) =>
              so.shopName.toLowerCase().replace(/\s+/g, "-") ===
              shopSlug.toLowerCase()
          ) || order.shopOrders[0]
        : order.shopOrders?.[0] || null;

    return {
      items: order.items || [],
      subtotal: order.subtotal || 0,
      shipping: order.shipping || 0,
      discount: order.discount || 0,
      total: order.total || 0,
      status: order.status,
      shopOrderCode: shopOrder ? shopOrder.shopOrderCode : order.orderNumber,
      pointsUsed: shopOrder?.pointsUsed,
      pointsValue: shopOrder?.pointsValue,
      paymentMethod: shopOrder?.paymentMethod,
      fulfillmentType: shopOrder?.fulfillmentType,
      // pickupToken is not included in admin responses for security
    };
  }, [order, shopSlug]);

  // Check if order is pickup
  const isPickupOrder = displayData?.fulfillmentType === "PICKUP";
  const isDeliveryOrder = displayData?.fulfillmentType === "DELIVERY";

  // Filter delivery agents based on search term
  useEffect(() => {
    if (!agentSearchTerm.trim()) {
      setFilteredAgents(deliveryAgents);
    } else {
      const filtered = deliveryAgents.filter(
        (agent) =>
          agent.firstName
            .toLowerCase()
            .includes(agentSearchTerm.toLowerCase()) ||
          agent.lastName
            .toLowerCase()
            .includes(agentSearchTerm.toLowerCase()) ||
          agent.userEmail
            .toLowerCase()
            .includes(agentSearchTerm.toLowerCase()) ||
          `${agent.firstName} ${agent.lastName}`
            .toLowerCase()
            .includes(agentSearchTerm.toLowerCase())
      );
      setFilteredAgents(filtered);
    }
  }, [deliveryAgents, agentSearchTerm]);

  const handleStatusUpdate = async () => {
    if (!newStatus || !order) return;

    try {
      setUpdating(true);
      const updatedOrder = await orderService.updateOrderStatus(
        order.id,
        newStatus
      );
      setOrder(updatedOrder);
      setStatusUpdateOpen(false);
      setNewStatus("");
      toast.success("Order status updated successfully!");
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Failed to update order status. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const openDeliveryModal = async () => {
    setSelectedAgent("");
    setAgentSearchTerm("");
    setDeliveryModalOpen(true);
    setLoadingAgents(true);

    try {
      const response = await userService.getDeliveryAgents(0, 100);
      setDeliveryAgents(response.content);
      setFilteredAgents(response.content);
    } catch (error) {
      console.error("Error fetching delivery agents:", error);
      toast.error("Failed to load delivery agents. Please try again.");
    } finally {
      setLoadingAgents(false);
    }
  };

  const handleDeliveryAssignment = async () => {
    if (!selectedAgent || !order) return;

    try {
      setAssigning(true);
      // await userService.assignDeliveryAgent(order.id, selectedAgent); // Old method - now using delivery groups
      setDeliveryModalOpen(false);
      setSelectedAgent("");
      setAgentSearchTerm("");
      toast.success("Delivery agent assigned successfully!");
    } catch (error) {
      console.error("Error assigning delivery agent:", error);
      toast.error("Failed to assign delivery agent. Please try again.");
    } finally {
      setAssigning(false);
    }
  };

  const handleQRScanSuccess = async (scannedCode: string) => {
    if (!order || !displayData) return;

    try {
      setIsVerifyingPickup(true);
      setPickupVerificationError(null);
      setPickupVerificationResult(null);

      const result = await orderService.verifyPickupOrder(
        scannedCode,
        shopId || undefined
      );

      if (result.success) {
        setPickupVerificationResult({
          success: true,
          message: "Pickup order verified successfully! Order marked as delivered.",
        });
        toast.success("Pickup order verified successfully! Order marked as delivered.");
        // Refresh order data
        const updatedOrder = await orderService.getOrderById(order.id, undefined, shopId);
        setOrder(updatedOrder);
        setShowQRScanner(false);
      } else {
        const errorMsg = result.message || "Verification failed";
        setPickupVerificationError(errorMsg);
        setPickupVerificationResult({
          success: false,
          message: errorMsg,
        });
      }
    } catch (error: any) {
      const errorMessage = error.message || "An error occurred during verification";
      setPickupVerificationError(errorMessage);
      setPickupVerificationResult({
        success: false,
        message: errorMessage,
      });
      toast.error(errorMessage);
    } finally {
      setIsVerifyingPickup(false);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsVerifyingPickup(true);
      setPickupVerificationError(null);
      setPickupVerificationResult(null);

      const QrScanner = (await import("qr-scanner")).default;
      const result = await QrScanner.scanImage(file);

      if (result) {
        await handleQRScanSuccess(result);
      } else {
        setPickupVerificationResult({
          success: false,
          message: "No QR code found in the uploaded image",
        });
        setPickupVerificationError("No QR code found in the uploaded image");
      }
    } catch (error: any) {
      const errorMsg = error.message || "Failed to scan QR code from image";
      setPickupVerificationResult({
        success: false,
        message: errorMsg,
      });
      setPickupVerificationError(errorMsg);
    } finally {
      setIsVerifyingPickup(false);
      // Reset file input
      const fileInput = document.getElementById(
        "qr-image-upload-pickup"
      ) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case OrderStatus.PENDING:
        return "secondary";
      case OrderStatus.PROCESSING:
        return "default";
      case OrderStatus.SHIPPED:
        return "outline";
      case OrderStatus.DELIVERED:
        return "default";
      case OrderStatus.CANCELLED:
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getPaymentStatusBadgeVariant = (status: string) => {
    switch (status) {
      case OrderPaymentStatus.PENDING:
        return "secondary";
      case OrderPaymentStatus.COMPLETED:
        return "default";
      case OrderPaymentStatus.CANCELLED:
        return "destructive";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="grid gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Order Not Found</h3>
              <p className="text-muted-foreground">
                The order you're looking for doesn't exist or has been removed.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Order Details</h1>
            <p className="text-muted-foreground">
              {shopSlug ? "Shop Order" : "Order"} #
              {displayData?.shopOrderCode || order.orderNumber}
            </p>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <div className="flex gap-2">
            <Badge
              variant={getStatusBadgeVariant(
                displayData?.status || order.status
              )}
              className={
                (displayData?.status || order.status) ===
                  OrderStatus.PROCESSING ||
                (displayData?.status || order.status) === OrderStatus.DELIVERED
                  ? "bg-primary hover:bg-primary/90"
                  : ""
              }
            >
              {displayData?.status || order.status}
            </Badge>
            {order.paymentInfo?.paymentStatus && (
              <Badge
                variant={getPaymentStatusBadgeVariant(
                  order.paymentInfo.paymentStatus
                )}
                className={
                  order.paymentInfo.paymentStatus ===
                  OrderPaymentStatus.COMPLETED
                    ? "bg-primary hover:bg-primary/90"
                    : ""
                }
              >
                {order.paymentInfo.paymentStatus}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Order Number
                  </label>
                  <div className="mt-1">
                    <TruncatedText
                      text={order.orderNumber}
                      maxLength={20}
                      className="font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Customer
                  </label>
                  <div className="mt-1">
                    {order.customerName ? (
                      <div>
                        <p className="font-medium">{order.customerName}</p>
                        {order.customerEmail && (
                          <p className="text-sm text-muted-foreground">
                            {order.customerEmail}
                          </p>
                        )}
                        {order.customerPhone && (
                          <p className="text-sm text-muted-foreground">
                            {order.customerPhone}
                          </p>
                        )}
                      </div>
                    ) : (
                      <TruncatedText
                        text={order.userId}
                        maxLength={16}
                        className="font-medium"
                      />
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Created At
                  </label>
                  <p className="font-medium">
                    {format(new Date(order.createdAt), "PPP 'at' p")}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Last Updated
                  </label>
                  <p className="font-medium">
                    {format(new Date(order.updatedAt), "PPP 'at' p")}
                  </p>
                </div>
                {(() => {
                  const shopOrder = shopSlug && order.shopOrders && order.shopOrders.length > 0
                    ? order.shopOrders.find(
                        (so) =>
                          so.shopName.toLowerCase().replace(/\s+/g, "-") ===
                          shopSlug.toLowerCase()
                      ) || order.shopOrders[0]
                    : order.shopOrders?.[0];
                  
                  if (shopOrder?.fulfillmentType) {
                    return (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Fulfillment Method
                        </label>
                        <div className="mt-1">
                          <Badge
                            variant="outline"
                            className={
                              shopOrder.fulfillmentType === "PICKUP"
                                ? "bg-purple-100 text-purple-700 border-purple-200"
                                : "bg-indigo-100 text-indigo-700 border-indigo-200"
                            }
                          >
                            {shopOrder.fulfillmentType === "PICKUP" ? (
                              <>
                                <Package className="h-3 w-3 mr-1 inline" />
                                Pickup at Shop
                              </>
                            ) : (
                              <>
                                <Truck className="h-3 w-3 mr-1 inline" />
                                Delivery
                              </>
                            )}
                          </Badge>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Associated Return Requests - Only show if there are returns */}
          {orderReturns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5" />
                  Associated Return Requests
                </CardTitle>
                <CardDescription>
                  {loadingReturns
                    ? "Loading..."
                    : `${orderReturns.length} return request(s)`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingReturns ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : orderReturns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <RotateCcw className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No return requests for this order</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orderReturns.map((returnReq) => (
                      <div
                        key={returnReq.id}
                        className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              Return #{String(returnReq.id).slice(-8)}
                            </span>
                            <Badge
                              variant={
                                returnReq.status === "PENDING"
                                  ? "secondary"
                                  : returnReq.status === "APPROVED"
                                  ? "default"
                                  : returnReq.status === "DENIED"
                                  ? "destructive"
                                  : "outline"
                              }
                            >
                              {returnReq.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>
                              Submitted:{" "}
                              {format(new Date(returnReq.submittedAt), "PPP")}
                            </p>
                            <p>{returnReq.returnItems?.length || 0} item(s)</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(`/dashboard/returns/${returnReq.id}`)
                          }
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
              <CardDescription>
                {displayData?.items?.length || 0} item(s) in this order
              </CardDescription>
            </CardHeader>
            <CardContent>
              {displayData?.items && displayData.items.length > 0 ? (
                <div className="space-y-4">
                  {displayData.items.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="flex gap-4 items-start p-4 border rounded-md"
                    >
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
                          {item.product?.images &&
                          item.product.images.length > 0 ? (
                            <img
                              src={item.product.images[0]}
                              alt={item.product.name || "Product"}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target =
                                  e.currentTarget as HTMLImageElement;
                                target.style.display = "none";
                                const nextElement =
                                  target.nextElementSibling as HTMLElement;
                                if (nextElement) {
                                  nextElement.style.display = "flex";
                                }
                              }}
                            />
                          ) : null}
                          <div
                            className="w-full h-full flex items-center justify-center text-gray-400"
                            style={{
                              display:
                                item.product?.images &&
                                item.product.images.length > 0
                                  ? "none"
                                  : "flex",
                            }}
                          >
                            <Package className="h-6 w-6" />
                          </div>
                        </div>
                      </div>

                      <div className="flex-1">
                        <h4 className="font-medium">
                          {item.product?.name ||
                            `Product ID: ${item.productId}`}
                        </h4>
                        {item.product?.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.product.description}
                          </p>
                        )}

                        {item.hasDiscount &&
                          item.originalPrice &&
                          item.discountPercentage && (
                            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="secondary"
                                    className="bg-green-100 text-green-800 font-semibold"
                                  >
                                    -{Math.round(item.discountPercentage)}%
                                    DISCOUNT
                                  </Badge>
                                  <span className="text-xs text-green-700 font-medium">
                                    Applied at purchase
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <div className="text-sm">
                                  <span className="text-muted-foreground">
                                    Original:{" "}
                                  </span>
                                  <span className="line-through text-red-600 font-medium">
                                    {(item.originalPrice || 0).toLocaleString()}{" "}
                                    RWF
                                  </span>
                                </div>
                                <div className="text-sm">
                                  <span className="text-muted-foreground">
                                    Discounted:{" "}
                                  </span>
                                  <span className="text-green-700 font-semibold">
                                    {(item.price || 0).toLocaleString()} RWF
                                  </span>
                                </div>
                                <div className="text-sm">
                                  <span className="text-muted-foreground">
                                    Saved:{" "}
                                  </span>
                                  <span className="text-green-700 font-semibold">
                                    {(
                                      (item.originalPrice || 0) -
                                      (item.price || 0)
                                    ).toLocaleString()}{" "}
                                    RWF
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>Quantity: {item.quantity}</span>
                          {!item.hasDiscount && (
                            <span>
                              Price: {(item.price || 0).toLocaleString()} RWF
                            </span>
                          )}
                          {item.availableStock !== undefined && (
                            <span>Stock: {item.availableStock}</span>
                          )}
                        </div>
                        {item.variantId && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Variant ID: {item.variantId}
                          </p>
                        )}

                        {/* Warehouse and Batch Information */}
                        {item.warehouses && item.warehouses.length > 0 && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-md">
                            <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              Sourced from {item.warehouses.length} warehouse(s)
                            </h5>
                            <div className="space-y-2">
                              {item.warehouses.map(
                                (warehouse, warehouseIndex) => (
                                  <div
                                    key={warehouse.warehouseId}
                                    className="text-xs"
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium text-green-700">
                                        {warehouse.warehouseName}
                                      </span>
                                      <span className="text-muted-foreground">
                                        Qty: {warehouse.quantityFromWarehouse}
                                      </span>
                                    </div>
                                    {warehouse.warehouseLocation && (
                                      <p className="text-muted-foreground mb-1">
                                        📍 {warehouse.warehouseLocation}
                                      </p>
                                    )}

                                    {/* Batches */}
                                    {warehouse.batches &&
                                      warehouse.batches.length > 0 && (
                                        <div className="ml-4 mt-1">
                                          <p className="text-muted-foreground mb-1">
                                            Batches ({warehouse.batches.length}
                                            ):
                                          </p>
                                          <div className="space-y-1">
                                            {warehouse.batches.map(
                                              (batch, batchIndex) => (
                                                <div
                                                  key={batch.batchId}
                                                  className="flex items-center justify-between bg-white p-2 rounded border"
                                                >
                                                  <div>
                                                    <span className="font-mono text-xs">
                                                      {batch.batchNumber}
                                                    </span>
                                                    <Badge
                                                      variant={
                                                        batch.batchStatus ===
                                                        "ACTIVE"
                                                          ? "default"
                                                          : "secondary"
                                                      }
                                                      className="ml-2 text-xs"
                                                    >
                                                      {batch.batchStatus}
                                                    </Badge>
                                                  </div>
                                                  <span className="text-muted-foreground">
                                                    Qty:{" "}
                                                    {batch.quantityFromBatch}
                                                  </span>
                                                </div>
                                              )
                                            )}
                                          </div>
                                        </div>
                                      )}
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Price */}
                      <div className="text-right flex-shrink-0">
                        {item.hasDiscount && item.originalPrice ? (
                          <div>
                            <p className="text-sm text-muted-foreground line-through">
                              {(
                                (item.originalPrice || 0) * item.quantity
                              ).toLocaleString()}{" "}
                              RWF
                            </p>
                            <p className="font-medium text-green-600">
                              {(
                                item.totalPrice ||
                                (item.price || 0) * item.quantity
                              ).toLocaleString()}{" "}
                              RWF
                            </p>
                            <p className="text-xs text-green-600">
                              Saved:{" "}
                              {(
                                ((item.originalPrice || 0) -
                                  (item.price || 0)) *
                                item.quantity
                              ).toLocaleString()}{" "}
                              RWF
                            </p>
                          </div>
                        ) : (
                          <p className="font-medium">
                            {(
                              item.totalPrice ||
                              (item.price || 0) * item.quantity
                            ).toLocaleString()}{" "}
                            RWF
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No items found for this order</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{(displayData?.subtotal || 0).toLocaleString()} RWF</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax</span>
                <span>{(order.tax || 0).toLocaleString()} RWF</span>
              </div>
              {displayData?.shipping !== null &&
                displayData?.shipping !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span>Shipping</span>
                    <span>
                      {(displayData.shipping || 0).toLocaleString()} RWF
                    </span>
                  </div>
                )}
              {displayData?.discount && displayData.discount > 0 ? (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>
                    -{(displayData.discount || 0).toLocaleString()} RWF
                  </span>
                </div>
              ) : null}
              {/* Shop Specific Points Info */}
              {displayData?.pointsUsed !== undefined &&
              displayData.pointsUsed > 0 ? (
                <>
                  <div className="pt-3 border-t">
                    <label className="text-sm font-medium text-muted-foreground">
                      Points Used (this shop)
                    </label>
                    <p className="text-sm font-bold text-yellow-600">
                      {displayData.pointsUsed} points
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Points Value
                    </label>
                    <p className="text-sm font-bold text-green-600">
                      -{(displayData.pointsValue || 0).toLocaleString()} RWF
                    </p>
                  </div>
                  {displayData.paymentMethod === "HYBRID" && (
                    <div className="text-xs text-muted-foreground italic">
                      Hybrid Payment (Points + Card)
                    </div>
                  )}
                  {displayData.paymentMethod === "POINTS" && (
                    <div className="text-xs text-green-600 font-medium italic">
                      Full Points Payment
                    </div>
                  )}
                </>
              ) : (
                /* Fallback to global points info if not shop-specific but still hybrid/points */
                (order.paymentInfo?.paymentMethod === "POINTS" ||
                  order.paymentInfo?.paymentMethod === "HYBRID") &&
                order.paymentInfo?.pointsUsed !== undefined &&
                order.paymentInfo?.pointsUsed > 0 && (
                  <>
                    <div className="pt-3 border-t">
                      <label className="text-sm font-medium text-muted-foreground">
                        Order Points Used
                      </label>
                      <p className="text-sm font-bold text-yellow-600">
                        {order.paymentInfo?.pointsUsed} points
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Points Value
                      </label>
                      <p className="text-sm font-bold text-green-600">
                        -{(order.paymentInfo.pointsValue || 0).toLocaleString()}{" "}
                        RWF
                      </p>
                    </div>
                  </>
                )
              )}
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-primary">
                  {(displayData?.total || 0).toLocaleString()} RWF
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          {order.shippingAddress && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Delivery Address
                </CardTitle>
                <CardDescription>
                  Complete address information for delivery
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Street Address
                  </label>
                  <p className="text-sm font-medium">
                    {order.shippingAddress.street || "Not provided"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      City
                    </label>
                    <p className="text-sm">
                      {order.shippingAddress.city || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      State
                    </label>
                    <p className="text-sm">
                      {order.shippingAddress.state || "Not provided"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Country
                    </label>
                    <p className="text-sm font-medium">
                      {order.shippingAddress.country || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Phone
                    </label>
                    <p className="text-sm">
                      {order.shippingAddress.phone || "Not provided"}
                    </p>
                  </div>
                </div>

                {/* Google Maps Integration */}
                {order.shippingAddress.latitude &&
                  order.shippingAddress.longitude && (
                    <div className="space-y-3">
                      <Separator />
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Delivery Location
                        </label>
                        <div className="mt-2">
                          {/* Map Type Toggle Buttons */}
                          <div className="flex gap-1 mb-2">
                            <Button
                              variant={
                                mapType === "satellite" ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setMapType("satellite")}
                              className="text-xs"
                            >
                              Satellite
                            </Button>
                            <Button
                              variant={
                                mapType === "roadmap" ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setMapType("roadmap")}
                              className="text-xs"
                            >
                              Roadmap
                            </Button>
                            <Button
                              variant={
                                mapType === "hybrid" ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setMapType("hybrid")}
                              className="text-xs"
                            >
                              Hybrid
                            </Button>
                            <Button
                              variant={
                                mapType === "terrain" ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setMapType("terrain")}
                              className="text-xs"
                            >
                              Terrain
                            </Button>
                          </div>

                          {/* Google Maps Embed with Dynamic Map Type */}
                          <div className="relative w-full h-48 rounded-md overflow-hidden border">
                            <iframe
                              src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${order.shippingAddress.latitude},${order.shippingAddress.longitude}&zoom=18&maptype=${mapType}`}
                              width="100%"
                              height="100%"
                              style={{ border: 0 }}
                              allowFullScreen
                              loading="lazy"
                              referrerPolicy="no-referrer-when-downgrade"
                              className="rounded-md"
                            />
                          </div>

                          {/* Coordinates and Actions */}
                          <div className="flex items-center justify-between mt-2">
                            <div className="text-xs text-muted-foreground">
                              <p>
                                Lat: {order.shippingAddress.latitude.toFixed(6)}
                              </p>
                              <p>
                                Lng:{" "}
                                {order.shippingAddress.longitude.toFixed(6)}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const url = `https://www.google.com/maps?q=${order.shippingAddress.latitude},${order.shippingAddress.longitude}`;
                                  window.open(url, "_blank");
                                }}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Open in Maps
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const url = `https://www.google.com/maps/dir/?api=1&destination=${order.shippingAddress.latitude},${order.shippingAddress.longitude}`;
                                  window.open(url, "_blank");
                                }}
                              >
                                <Truck className="h-3 w-3 mr-1" />
                                Get Directions
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                {order.shippingAddress.phone && (
                  <div className="pt-2 border-t">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Contact Phone
                    </label>
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">
                      {order.shippingAddress.phone}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.paymentInfo?.paymentMethod && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Payment Method
                  </label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      {displayData?.paymentMethod ||
                        order.paymentInfo.paymentMethod}
                    </p>
                    {displayData?.paymentMethod === "POINTS" && (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-green-50 text-green-700 border-green-200"
                      >
                        POINTS
                      </Badge>
                    )}
                    {displayData?.paymentMethod === "HYBRID" && (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-green-50 text-green-700 border-green-200"
                      >
                        HYBRID
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              {order.paymentInfo?.paymentStatus && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Payment Status
                  </label>
                  <div className="mt-1">
                    <Badge
                      variant={getPaymentStatusBadgeVariant(
                        order.paymentInfo.paymentStatus
                      )}
                      className={
                        order.paymentInfo.paymentStatus ===
                        OrderPaymentStatus.COMPLETED
                          ? "bg-primary hover:bg-primary/90"
                          : ""
                      }
                    >
                      {order.paymentInfo.paymentStatus}
                    </Badge>
                  </div>
                </div>
              )}
              {order.paymentInfo?.transactionRef && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Transaction Reference
                  </label>
                  <div className="mt-1">
                    <TruncatedText
                      text={order.paymentInfo.transactionRef}
                      maxLength={16}
                      className="font-medium text-xs"
                    />
                  </div>
                </div>
              )}
              {order.paymentInfo?.paymentDate && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Payment Date
                  </label>
                  <p className="text-sm">
                    {format(
                      new Date(order.paymentInfo.paymentDate),
                      "PPP 'at' p"
                    )}
                  </p>
                </div>
              )}
              {order.paymentInfo?.receiptUrl && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Receipt
                  </label>
                  <a
                    href={order.paymentInfo.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline block"
                  >
                    View Receipt
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tracking Information */}
          {(order.trackingNumber || order.estimatedDelivery) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Tracking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.trackingNumber && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Tracking Number
                    </label>
                    <div className="mt-1">
                      <TruncatedText
                        text={order.trackingNumber}
                        maxLength={16}
                        className="font-medium"
                      />
                    </div>
                  </div>
                )}
                {order.estimatedDelivery && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Estimated Delivery
                    </label>
                    <p className="text-sm">{order.estimatedDelivery}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Pickup Order QR Scanner */}
          {isPickupOrder && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Pickup Verification
                </CardTitle>
                <CardDescription>
                  Scan the QR code to verify and mark this pickup order as delivered
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Verification Result */}
                {pickupVerificationResult && (
                  <div
                    className={`p-4 rounded-md ${
                      pickupVerificationResult.success
                        ? "bg-green-50 border border-green-200"
                        : "bg-red-50 border border-red-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {pickupVerificationResult.success ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <X className="h-5 w-5 text-red-600" />
                      )}
                      <p
                        className={`text-sm font-medium ${
                          pickupVerificationResult.success
                            ? "text-green-800"
                            : "text-red-800"
                        }`}
                      >
                        {pickupVerificationResult.message}
                      </p>
                    </div>
                  </div>
                )}

                {pickupVerificationError && !pickupVerificationResult && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{pickupVerificationError}</AlertDescription>
                  </Alert>
                )}

                {order.status !== OrderStatus.DELIVERED && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Camera Scan */}
                    <Button
                      onClick={() => setShowQRScanner(true)}
                      disabled={isVerifyingPickup}
                      size="lg"
                      className="flex items-center gap-2 h-12"
                    >
                      <Camera className="h-5 w-5" />
                      {isVerifyingPickup ? "Verifying..." : "Scan with Camera"}
                    </Button>

                    {/* Image Upload */}
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={isVerifyingPickup}
                        className="sr-only"
                        id="qr-image-upload-pickup"
                      />
                      <Button
                        variant="outline"
                        size="lg"
                        disabled={isVerifyingPickup}
                        onClick={() => {
                          const fileInput = document.getElementById(
                            "qr-image-upload-pickup"
                          ) as HTMLInputElement;
                          if (fileInput) {
                            fileInput.click();
                          }
                        }}
                        className="w-full flex items-center gap-2 h-12"
                      >
                        <Upload className="h-5 w-5" />
                        {isVerifyingPickup ? "Processing..." : "Upload QR Image"}
                      </Button>
                    </div>
                  </div>
                )}

                {order.status === OrderStatus.DELIVERED && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700">
                      <Check className="h-5 w-5" />
                      <span className="font-semibold">Order Already Delivered</span>
                    </div>
                    <p className="text-sm text-green-600 mt-2">
                      This pickup order has been verified and marked as delivered.
                    </p>
                  </div>
                )}

                {/* Instructions */}
                {order.status !== OrderStatus.DELIVERED && (
                  <div className="bg-green-50 p-4 rounded-md">
                    <p className="font-medium mb-2 text-green-900">Quick Instructions:</p>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• Ask customer to show their pickup QR code</li>
                      <li>• Use camera for real-time scanning (recommended)</li>
                      <li>• Or take a photo and upload it</li>
                      <li>• Order will be marked as delivered once verified</li>
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Status Update Dialog */}
      <Dialog open={statusUpdateOpen} onOpenChange={setStatusUpdateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              Change the status of order #{order?.orderNumber}. This will update
              the order for both admin and customer views.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Status</label>
              <p className="text-sm text-muted-foreground">{order?.status}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Status</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={OrderStatus.PENDING}>
                    {OrderStatus.PENDING}
                  </SelectItem>
                  <SelectItem value={OrderStatus.PROCESSING}>
                    {OrderStatus.PROCESSING}
                  </SelectItem>
                  <SelectItem value={OrderStatus.SHIPPED}>
                    {OrderStatus.SHIPPED}
                  </SelectItem>
                  <SelectItem value={OrderStatus.DELIVERED}>
                    {OrderStatus.DELIVERED}
                  </SelectItem>
                  <SelectItem value={OrderStatus.CANCELLED}>
                    {OrderStatus.CANCELLED}
                  </SelectItem>
                  <SelectItem value={OrderStatus.REFUNDED}>
                    {OrderStatus.REFUNDED}
                  </SelectItem>
                  <SelectItem value={OrderStatus.RETURNED}>
                    {OrderStatus.RETURNED}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusUpdateOpen(false)}
              disabled={updating}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleStatusUpdate}
              disabled={updating || !newStatus || newStatus === order?.status}
            >
              {updating ? (
                "Updating..."
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Update Status
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Scanner Modal for Pickup Orders */}
      {isPickupOrder && (
        <QRScannerModal
          isOpen={showQRScanner}
          onClose={() => {
            setShowQRScanner(false);
            setPickupVerificationError(null);
          }}
          orderCode={displayData?.shopOrderCode || order?.orderNumber || ""}
          onSuccess={handleQRScanSuccess}
          isValidating={isVerifyingPickup}
        />
      )}
    </div>
  );
}
