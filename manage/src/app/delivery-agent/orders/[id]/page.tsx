"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  CreditCard,
  Package,
  User,
  FileText,
  Check,
  X,
  Truck,
  Phone,
  Mail,
  QrCode,
  Camera,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  deliveryAgentService,
  OrderDTO,
} from "@/lib/services/delivery-agent-service";
import QRScannerModal from "@/components/QRScannerModal";
import { orderService } from "@/lib/services/order-service";
import LiveRouteMap from "@/components/delivery/LiveRouteMap";
import AddOrderNoteDialog from "@/components/delivery-agent/AddOrderNoteDialog";
import ViewOrderNotesDialog from "@/components/delivery-agent/ViewOrderNotesDialog";
import { formatCurrency } from "@/lib/utils";

export default function DeliveryAgentOrderDetails() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [showAddNoteDialog, setShowAddNoteDialog] = useState(false);
  const [showViewNotesDialog, setShowViewNotesDialog] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const orderData = await deliveryAgentService.getOrderDetails(
          parseInt(orderId)
        );
        setOrder(orderData);
      } catch (err) {
        setError("Failed to fetch order details");
        console.error("Error fetching order:", err);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const handleQRScanSuccess = async (scannedCode: string) => {
    try {
      setIsVerifying(true);
      setVerificationResult(null);

      // Verify the delivery using the scanned pickup token
      const result = await orderService.verifyDelivery(scannedCode);

      if (result.success) {
        setVerificationResult({
          success: true,
          message: "Delivery verified successfully! Order marked as delivered.",
        });
        // Refresh order data to show updated status
        const updatedOrder = await deliveryAgentService.getOrderDetails(
          parseInt(orderId)
        );
        setOrder(updatedOrder);
      } else {
        setVerificationResult({
          success: false,
          message: result.message || "Verification failed",
        });
      }
    } catch (error: any) {
      setVerificationResult({
        success: false,
        message: error.message || "An error occurred during verification",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsVerifying(true);
      setVerificationResult(null);

      const QrScanner = (await import("qr-scanner")).default;
      const result = await QrScanner.scanImage(file);

      if (result) {
        await handleQRScanSuccess(result);
      } else {
        setVerificationResult({
          success: false,
          message: "No QR code found in the uploaded image",
        });
      }
    } catch (error: any) {
      setVerificationResult({
        success: false,
        message: error.message || "Failed to scan QR code from image",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "CONFIRMED":
        return "bg-green-100 text-green-800";
      case "PROCESSING":
        return "bg-purple-100 text-purple-800";
      case "SHIPPED":
        return "bg-indigo-100 text-indigo-800";
      case "DELIVERED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      case "READY_FOR_DELIVERY":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrencyDisplay = (amount: number | string) =>
    formatCurrency(typeof amount === "string" ? parseFloat(amount) : amount);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Order Not Found</h3>
          <p className="text-muted-foreground mb-4">
            {error || "The order you're looking for doesn't exist."}
          </p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Order Details</h1>
            <p className="text-muted-foreground">Order #{order.orderNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(order.status)}>
            {order.status.replace(/_/g, " ")}
          </Badge>
        </div>
      </div>

      {/* New Responsive Layout - Mobile First, Most Important Info First */}
      <div className="space-y-6">
        {/* TOP PRIORITY: QR Code Verification - Most Critical for Delivery Agents */}
        {order.status !== "DELIVERED" && (
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <QrCode className="h-6 w-6" />
                Verify Delivery - Action Required
              </CardTitle>
              <CardDescription className="text-base">
                Scan the customer's QR code to complete this delivery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Verification Result */}
                {verificationResult && (
                  <div
                    className={`p-4 rounded-md ${
                      verificationResult.success
                        ? "bg-green-50 border border-green-200"
                        : "bg-red-50 border border-red-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {verificationResult.success ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <X className="h-5 w-5 text-red-600" />
                      )}
                      <p
                        className={`text-sm font-medium ${
                          verificationResult.success
                            ? "text-green-800"
                            : "text-red-800"
                        }`}
                      >
                        {verificationResult.message}
                      </p>
                    </div>
                  </div>
                )}

                {/* Verification Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Camera Scan */}
                  <Button
                    onClick={() => setShowQRScanner(true)}
                    disabled={isVerifying}
                    size="lg"
                    className="flex items-center gap-2 h-12"
                  >
                    <Camera className="h-5 w-5" />
                    {isVerifying ? "Verifying..." : "Scan with Camera"}
                  </Button>

                  {/* Image Upload */}
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={isVerifying}
                      className="sr-only"
                      id="qr-image-upload"
                    />
                    <Button
                      variant="outline"
                      size="lg"
                      disabled={isVerifying}
                      onClick={() => {
                        const fileInput = document.getElementById(
                          "qr-image-upload"
                        ) as HTMLInputElement;
                        if (fileInput) {
                          fileInput.click();
                        }
                      }}
                      className="w-full flex items-center gap-2 h-12"
                    >
                      <Upload className="h-5 w-5" />
                      {isVerifying ? "Processing..." : "Upload QR Image"}
                    </Button>
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-green-50 p-4 rounded-md">
                  <p className="font-medium mb-2 text-green-900">Quick Instructions:</p>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Ask customer to show their pickup QR code</li>
                    <li>• Use camera for real-time scanning (recommended)</li>
                    <li>• Or take a photo and upload it</li>
                    <li>• Order will be marked as delivered once verified</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delivery Completed Status */}
        {order.status === "DELIVERED" && (
          <Card className="border-2 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <Check className="h-6 w-6" />
                Delivery Completed Successfully
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div className="bg-green-100 p-6 rounded-full w-fit mx-auto">
                  <Check className="h-16 w-16 text-green-600" />
                </div>
                <div>
                  <p className="text-xl font-semibold text-green-700 mb-2">
                    Order Successfully Delivered
                  </p>
                  <p className="text-green-600">
                    This order has been verified and marked as delivered.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SECOND PRIORITY: Customer Information & Contact - Critical for Communication */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="text-lg">
                      {order.customerName?.charAt(0) || "C"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-lg">
                      {order.customerName || "Customer"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {order.customerEmail}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <a 
                    href={`tel:${order.customerPhone}`}
                    className="flex items-center gap-3 p-3 rounded-md bg-green-50 hover:bg-green-100 transition-colors"
                  >
                    <Phone className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">Call Customer</p>
                      <p className="text-sm text-green-700">{order.customerPhone}</p>
                    </div>
                  </a>
                  <a 
                    href={`mailto:${order.customerEmail}`}
                    className="flex items-center gap-3 p-3 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <Mail className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">Email Customer</p>
                      <p className="text-sm text-gray-700">{order.customerEmail}</p>
                    </div>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* THIRD PRIORITY: Delivery Address Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Delivery Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-1" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-base mb-1">Delivery Location</h4>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {order.shippingAddress?.streetAddress || "N/A"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {order.shippingAddress?.city || "N/A"},{" "}
                        {order.shippingAddress?.state || "N/A"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {order.shippingAddress?.country || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Delivery Notes Section - Important for Communication */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Delivery Notes
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowViewNotesDialog(true)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View All Notes
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowAddNoteDialog(true)}
                  disabled={order.status === "DELIVERED"}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </div>
            </div>
            <CardDescription>
              Document important information about this delivery
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="bg-green-50 p-4 rounded-md">
                <p className="text-sm text-green-900 font-medium mb-2">
                  Why add notes?
                </p>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Record customer-specific delivery instructions</li>
                  <li>• Document any issues or delays for this order</li>
                  <li>• Keep track of communication with the customer</li>
                  <li>• Help other agents if redelivery is needed</li>
                </ul>
              </div>
              
              {order.status === "DELIVERED" && (
                <div className="bg-green-50 p-3 rounded-md border border-green-200">
                  <p className="text-sm text-green-800">
                    <strong>Note:</strong> This order has been delivered. You can view existing notes but cannot add new ones.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Live Navigation Map - Full Width for Better Visibility */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Live Navigation</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Real-time navigation to delivery location. Your position updates automatically.
          </p>
          <LiveRouteMap
            destinationAddress={`${order.shippingAddress?.streetAddress || ""}, ${order.shippingAddress?.city || ""}, ${order.shippingAddress?.state || ""}, ${order.shippingAddress?.country || ""}`}
            destinationName={`${order.customerName}'s Location`}
          />
        </div>

        {/* FOURTH PRIORITY: Order Items - Important but not critical for delivery */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Items ({order.items.length} items)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-4 border rounded-md hover:bg-gray-50 transition-colors"
                >
                  <div className="relative group">
                    {item.product?.images &&
                    item.product.images.length > 0 ? (
                      <div className="relative">
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name || "Product"}
                          className="w-20 h-20 object-cover rounded-lg"
                          onError={(e) => {
                            e.currentTarget.src = "/api/placeholder/100/100";
                          }}
                        />
                        {item.product.images.length > 1 && (
                          <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {item.product.images.length}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                        <Package className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">
                      {item.product?.name || "Product"}
                    </h4>
                    <p className="text-muted-foreground">
                      Quantity: <span className="font-medium">{item.quantity}</span>
                    </p>
                    {item.product?.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.product.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">
                      {formatCurrencyDisplay(item.price)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total: {formatCurrencyDisplay(item.totalPrice)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-lg">
                  <span>Total Amount</span>
                  <span className="font-semibold">{formatCurrencyDisplay(order.totalAmount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-xl font-bold">
                  <span>Order Total</span>
                  <span>{formatCurrencyDisplay(order.totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Order Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Order Placed</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                </div>

                {order.updatedAt && order.updatedAt !== order.createdAt && (
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Last Updated</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(order.updatedAt)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        orderCode={order?.orderNumber || ""}
        onSuccess={handleQRScanSuccess}
        isValidating={isVerifying}
      />

      {/* Add Order Note Dialog */}
      <AddOrderNoteDialog
        open={showAddNoteDialog}
        onOpenChange={setShowAddNoteDialog}
        orderId={parseInt(orderId)}
        orderNumber={order?.orderNumber || ""}
        onSuccess={() => {
          // Optionally refresh order data or show success message
          console.log("Note added successfully");
        }}
      />

      {/* View Order Notes Dialog */}
      <ViewOrderNotesDialog
        open={showViewNotesDialog}
        onOpenChange={setShowViewNotesDialog}
        orderId={parseInt(orderId)}
        orderNumber={order?.orderNumber || ""}
      />
    </div>
  );
}
