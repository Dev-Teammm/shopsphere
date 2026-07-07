"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  User,
  Calendar,
  DollarSign,
  AlertCircle,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  Video,
  Download,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  Play,
  X,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { ReturnRequestDTO, ReturnDecisionDTO } from "@/types/return";
import returnService from "@/services/returnService";
import { formatDistanceToNow, format } from "date-fns";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export default function ReturnRequestDetailPage() {
  const params = useParams();
  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const shopSlug = searchParams?.get("shopSlug");
  const router = useRouter();
  const returnRequestId = params.id as string;

  const [returnRequest, setReturnRequest] = useState<ReturnRequestDTO | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [refundScreenshot, setRefundScreenshot] = useState<File | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const [showMediaViewer, setShowMediaViewer] = useState(false);

  const fetchReturnRequest = async () => {
    try {
      setLoading(true);
      const data = await returnService.getReturnRequestById(
        String(returnRequestId),
      );
      setReturnRequest(data);
    } catch (error) {
      console.error("Failed to fetch return request:", error);
      toast.error("Failed to load return request details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (returnRequestId) {
      fetchReturnRequest();
    }
  }, [returnRequestId]);

  const handleDecision = async (decision: "APPROVED" | "DENIED") => {
    if (!returnRequest) return;

    // Validate rejection note if denying
    if (decision === "DENIED" && !decisionNotes.trim()) {
      toast.error("Please provide a reason for denying this return request");
      return;
    }

    // Validate refund screenshot is required for approvals
    if (decision === "APPROVED" && !refundScreenshot) {
      toast.error("Payment screenshot is required when approving return requests");
      return;
    }

    try {
      setProcessing(true);
      const decisionData: ReturnDecisionDTO = {
        returnRequestId: returnRequest.id,
        decision,
        decisionNotes: decisionNotes.trim() || undefined,
      };

      await returnService.reviewReturnRequest(decisionData, refundScreenshot || undefined);
      toast.success(`Return request ${decision.toLowerCase()} successfully`);

      // Refresh the data
      await fetchReturnRequest();
      setDecisionNotes("");
      setRefundScreenshot(null);
      // Reset file input
      const fileInput = document.getElementById(
        "refund-screenshot-input"
      ) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }
    } catch (error: any) {
      console.error("Failed to process decision:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to process decision";
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: {
        variant: "secondary" as const,
        icon: Clock,
        color: "text-yellow-600",
      },
      APPROVED: {
        variant: "default" as const,
        icon: CheckCircle,
        color: "text-green-600",
      },
      DENIED: {
        variant: "destructive" as const,
        icon: XCircle,
        color: "text-red-600",
      },
      COMPLETED: {
        variant: "default" as const,
        icon: CheckCircle,
        color: "text-green-600",
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return <Badge variant="secondary">{status}</Badge>;

    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const calculateTotalRefundAmount = () => {
    if (!returnRequest) return 0;
    if (
      returnRequest.totalAmount !== undefined &&
      returnRequest.totalAmount !== null
    ) {
      return returnRequest.totalAmount;
    }
    return returnRequest.returnItems.reduce((total, item) => {
      return total + (item.totalPrice || 0);
    }, 0);
  };

  const canMakeDecision = returnRequest?.status === "PENDING";

  const openMediaViewer = (media: any) => {
    setSelectedMedia(media);
    setShowMediaViewer(true);
  };

  const closeMediaViewer = () => {
    setSelectedMedia(null);
    setShowMediaViewer(false);
  };

  const isVideoFile = (media: any) => {
    return (
      media.fileType === "VIDEO" ||
      media.video ||
      (media.mimeType && media.mimeType.startsWith("video/")) ||
      (media.fileExtension &&
        ["mp4", "webm", "ogg", "avi", "mov"].includes(
          media.fileExtension.toLowerCase(),
        ))
    );
  };

  const isImageFile = (media: any) => {
    return (
      media.fileType === "IMAGE" ||
      media.image ||
      (media.mimeType && media.mimeType.startsWith("image/")) ||
      (media.fileExtension &&
        ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(
          media.fileExtension.toLowerCase(),
        ))
    );
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mr-3" />
          <span className="text-lg">Loading return request details...</span>
        </div>
      </div>
    );
  }

  if (!returnRequest) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Return request not found
          </h3>
          <p className="text-muted-foreground mb-4">
            The return request you're looking for doesn't exist or you don't
            have permission to view it.
          </p>
          <Link
            href={`/dashboard/returns${shopSlug ? `?shopSlug=${shopSlug}` : ""}`}
          >
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Return Requests
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard/returns${shopSlug ? `?shopSlug=${shopSlug}` : ""}`}
          >
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Return Request #{String(returnRequest.id).slice(-8)}
            </h1>
            <p className="text-muted-foreground">
              Order {returnRequest.orderNumber} • Submitted{" "}
              {formatDistanceToNow(new Date(returnRequest.submittedAt), {
                addSuffix: true,
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(returnRequest.status)}
          <Link
            href={`/dashboard/orders/${returnRequest.orderId}${shopSlug ? `?shopSlug=${shopSlug}` : ""}`}
          >
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Order
            </Button>
          </Link>
          <Button onClick={fetchReturnRequest} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Return Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Return Items ({returnRequest.returnItems.length})
              </CardTitle>
              <CardDescription>
                Items requested for return with quantities and reasons
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {returnRequest.returnItems.map((item, index) => (
                  <div
                    key={item.orderItemId || index}
                    className="border rounded-md p-4"
                  >
                    <div className="flex items-start gap-4">
                      {item.productImage && (
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{item.productName}</h4>
                            {item.variantName && (
                              <p className="text-sm text-muted-foreground">
                                Variant: {item.variantName}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span>
                                Quantity: {item.returnQuantity}
                                {item.maxQuantity
                                  ? ` of ${item.maxQuantity}`
                                  : ""}
                              </span>
                              {item.unitPrice && (
                                <span>
                                  Unit Price: {formatCurrency(item.unitPrice)}
                                </span>
                              )}
                            </div>
                          </div>
                          {item.totalPrice && (
                            <div className="text-right">
                              <div className="font-medium">
                                {formatCurrency(item.totalPrice)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Total Refund
                              </div>
                            </div>
                          )}
                        </div>
                        {item.itemReason && (
                          <div className="mt-3 p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium mb-1">
                              Reason for return:
                            </p>
                            <p className="text-sm">{item.itemReason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {calculateTotalRefundAmount() > 0 && (
                <>
                  <Separator className="my-4" />

                  <div className="flex items-center justify-between text-lg font-semibold">
                    <span>Total Refund Amount:</span>
                    <span className="text-green-600">
                      {formatCurrency(calculateTotalRefundAmount())}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Expected Refund */}
          {returnRequest.expectedRefund && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5" />
                  Expected Refund Breakdown
                </CardTitle>
                <CardDescription>
                  Calculated refund based on payment method and return items
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="space-y-4">
                    {/* Payment Method */}
                    <div className="flex items-center justify-between pb-3 border-b">
                      <span className="text-sm font-medium text-muted-foreground">
                        Payment Method
                      </span>
                      <Badge variant="outline" className="font-mono text-sm">
                        {returnRequest.expectedRefund.paymentMethod}
                      </Badge>
                    </div>

                    {/* Refund Components */}
                    <div className="space-y-3">
                      {returnRequest.expectedRefund.monetaryRefund > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">
                            Card Refund
                          </span>
                          <span className="text-xl font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(
                              returnRequest.expectedRefund.monetaryRefund || 0
                            )}
                          </span>
                        </div>
                      )}

                      {returnRequest.expectedRefund.pointsRefund > 0 && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">
                              Points Refund
                            </span>
                            <span className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                              {returnRequest.expectedRefund.pointsRefund} points
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              Points Value
                            </span>
                            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                              {formatCurrency(
                                returnRequest.expectedRefund
                                  .pointsRefundValue || 0
                              )}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Breakdown */}
                    <div className="pt-3 border-t space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Items Refund
                        </span>
                        <span className="font-medium">
                          {formatCurrency(
                            returnRequest.expectedRefund.itemsRefund || 0
                          )}
                        </span>
                      </div>
                      {returnRequest.expectedRefund.shippingRefund > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Shipping Refund
                          </span>
                          <span className="font-medium">
                            {formatCurrency(
                              returnRequest.expectedRefund.shippingRefund || 0
                            )}
                          </span>
                        </div>
                      )}
                      {returnRequest.expectedRefund.isFullReturn && (
                        <Badge variant="secondary" className="mt-2">
                          Full Order Return
                        </Badge>
                      )}
                    </div>

                    <Separator />

                    {/* Total */}
                    <div className="flex items-center justify-between pt-2">
                      <span className="font-bold text-lg">
                        Total Refund Value
                      </span>
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(
                          returnRequest.expectedRefund.totalRefundValue || 0
                        )}
                      </span>
                    </div>

                    {/* Description */}
                    <div className="pt-3 border-t">
                      <p className="text-sm text-muted-foreground italic">
                        {returnRequest.expectedRefund.refundDescription}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Return Reason */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Return Reason
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-muted rounded-md">
                <p>{returnRequest.reason}</p>
              </div>
            </CardContent>
          </Card>

          {/* Media Attachments */}
          {returnRequest.returnMedia &&
            returnRequest.returnMedia.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Media Attachments ({returnRequest.returnMedia.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {returnRequest.returnMedia.map((media) => (
                      <div
                        key={media.id}
                        className="border rounded-md p-3 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {isImageFile(media) ? (
                            <ImageIcon className="h-4 w-4 text-green-600" />
                          ) : (
                            <Video className="h-4 w-4 text-purple-600" />
                          )}
                          <span className="text-sm font-medium">
                            {media.fileType || "UNKNOWN"}
                          </span>
                        </div>

                        {/* Media Preview */}
                        <div
                          className="relative cursor-pointer group mb-2"
                          onClick={() => openMediaViewer(media)}
                        >
                          {isImageFile(media) ? (
                            <img
                              src={media.fileUrl}
                              alt="Return media"
                              className="w-full h-24 object-cover rounded-lg group-hover:opacity-80 transition-opacity"
                            />
                          ) : isVideoFile(media) ? (
                            <div className="relative w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                              <Play className="h-8 w-8 text-gray-600" />
                              <div className="absolute inset-0 bg-black bg-opacity-20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Play className="h-6 w-6 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                              <FileText className="h-8 w-8 text-gray-600" />
                            </div>
                          )}

                          {/* Overlay for click indication */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="bg-white bg-opacity-90 rounded-full p-2">
                                {isImageFile(media) ? (
                                  <ImageIcon className="h-4 w-4 text-gray-800" />
                                ) : (
                                  <Play className="h-4 w-4 text-gray-800" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(media.uploadedAt), "MMM dd, yyyy")}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openMediaViewer(media)}
                            >
                              {isImageFile(media) ? (
                                <ImageIcon className="h-3 w-3" />
                              ) : (
                                <Play className="h-3 w-3" />
                              )}
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <a
                                href={media.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Download className="h-3 w-3" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Decision Section */}
          {canMakeDecision && (
            <Card>
              <CardHeader>
                <CardTitle>Make Decision</CardTitle>
                <CardDescription>
                  Review the return request and make a decision
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Decision Notes (Optional)
                    </label>
                    <Textarea
                      placeholder="Add notes about your decision..."
                      value={decisionNotes}
                      onChange={(e) => setDecisionNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Payment Screenshot <span className="text-red-500">*</span>
                      <span className="text-xs text-muted-foreground font-normal ml-2">
                        (Required for approvals)
                      </span>
                    </label>
                    <div className="space-y-2">
                      <Input
                        id="refund-screenshot-input"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          setRefundScreenshot(file || null);
                        }}
                        disabled={processing}
                      />
                      {refundScreenshot && (
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                          <ImageIcon className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-muted-foreground flex-1">
                            {refundScreenshot.name}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setRefundScreenshot(null);
                              const fileInput = document.getElementById(
                                "refund-screenshot-input"
                              ) as HTMLInputElement;
                              if (fileInput) {
                                fileInput.value = "";
                              }
                            }}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      {refundScreenshot && (
                        <div className="mt-2">
                          <img
                            src={URL.createObjectURL(refundScreenshot)}
                            alt="Screenshot preview"
                            className="max-w-full max-h-48 object-contain rounded-md border"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleDecision("APPROVED")}
                      disabled={processing || !refundScreenshot}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Return
                    </Button>
                    <Button
                      onClick={() => handleDecision("DENIED")}
                      disabled={processing}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Deny Return
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {returnRequest.customerName || "Guest User"}
                </span>
              </div>
              {returnRequest.customerEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{returnRequest.customerEmail}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Order: {returnRequest.orderNumber}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-sm">Return Requested</p>
                  <p className="text-xs text-muted-foreground">
                    {format(
                      new Date(returnRequest.submittedAt),
                      "MMM dd, yyyy HH:mm",
                    )}
                  </p>
                </div>
              </div>

              {returnRequest.decisionAt && (
                <div className="flex items-start gap-3">
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      returnRequest.status === "APPROVED"
                        ? "bg-green-600"
                        : "bg-red-600"
                    }`}
                  ></div>
                  <div>
                    <p className="font-medium text-sm">
                      {returnRequest.status === "APPROVED"
                        ? "Approved"
                        : "Decision Made"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(
                        new Date(returnRequest.decisionAt),
                        "MMM dd, yyyy HH:mm",
                      )}
                    </p>
                    {returnRequest.decisionNotes && (
                      <p className="text-xs mt-1 p-2 bg-muted rounded">
                        {returnRequest.decisionNotes}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Return Appeal */}
          {returnRequest.returnAppeal && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Appeal Submitted
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Appeal Reason:</p>
                    <p className="text-sm text-muted-foreground">
                      {returnRequest.returnAppeal.reason}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Submitted:</p>
                    <p className="text-sm text-muted-foreground">
                      {format(
                        new Date(returnRequest.returnAppeal.submittedAt),
                        "MMM dd, yyyy HH:mm",
                      )}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {returnRequest.returnAppeal.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Media Viewer Dialog */}
      <Dialog open={showMediaViewer} onOpenChange={setShowMediaViewer}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                {selectedMedia && isImageFile(selectedMedia) ? (
                  <ImageIcon className="h-5 w-5" />
                ) : (
                  <Video className="h-5 w-5" />
                )}
                Media Attachment
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeMediaViewer}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="p-6 pt-0">
            {selectedMedia && (
              <div className="space-y-4">
                {/* Media Display */}
                <div className="flex justify-center bg-gray-50 rounded-md p-4">
                  {isImageFile(selectedMedia) ? (
                    <img
                      src={selectedMedia.fileUrl}
                      alt="Return media"
                      className="max-w-full max-h-[60vh] object-contain rounded-lg"
                    />
                  ) : isVideoFile(selectedMedia) ? (
                    <video
                      src={selectedMedia.fileUrl}
                      controls
                      className="max-w-full max-h-[60vh] rounded-lg"
                      preload="metadata"
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                      <FileText className="h-16 w-16 mb-4" />
                      <p>Preview not available for this file type</p>
                    </div>
                  )}
                </div>

                {/* Media Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">
                      File Type:
                    </span>
                    <p className="text-gray-600">
                      {selectedMedia.fileType || "Unknown"}
                    </p>
                  </div>
                  {selectedMedia.mimeType && (
                    <div>
                      <span className="font-medium text-gray-700">
                        MIME Type:
                      </span>
                      <p className="text-gray-600">{selectedMedia.mimeType}</p>
                    </div>
                  )}
                  {selectedMedia.fileSize && (
                    <div>
                      <span className="font-medium text-gray-700">
                        File Size:
                      </span>
                      <p className="text-gray-600">
                        {(selectedMedia.fileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-gray-700">Uploaded:</span>
                    <p className="text-gray-600">
                      {format(
                        new Date(selectedMedia.uploadedAt),
                        "MMM dd, yyyy HH:mm",
                      )}
                    </p>
                  </div>
                  {selectedMedia.width && selectedMedia.height && (
                    <div>
                      <span className="font-medium text-gray-700">
                        Dimensions:
                      </span>
                      <p className="text-gray-600">
                        {selectedMedia.width} × {selectedMedia.height}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-center gap-2 pt-4 border-t">
                  <Button variant="outline" asChild>
                    <a
                      href={selectedMedia.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open in New Tab
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a
                      href={selectedMedia.fileUrl}
                      download
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
