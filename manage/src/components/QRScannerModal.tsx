"use client";

import { useState, useEffect, useRef } from "react";
import { X, Camera, AlertCircle, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderCode: string;
  onSuccess: (scannedCode: string) => void;
  isValidating?: boolean; // Added to show loading state during backend validation
}

declare global {
  interface Window {
    Html5Qrcode: any;
  }
}

const QRScannerModal = ({
  isOpen,
  onClose,
  orderCode,
  onSuccess,
  isValidating = false,
}: QRScannerModalProps) => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [libraryLoaded, setLibraryLoaded] = useState(false);

  const scannerRef = useRef<any | null>(null);
  const scannerContainerId = "qr-reader";

  // Load the html5-qrcode library dynamically
  useEffect(() => {
    const loadQRLibrary = async () => {
      if (typeof window !== "undefined" && !window.Html5Qrcode) {
        try {
          const script = document.createElement("script");
          script.src =
            "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
          script.onload = () => {
            console.log("HTML5-QRCode library loaded successfully");
            setLibraryLoaded(true);
          };
          script.onerror = () => {
            console.error("Failed to load HTML5-QRCode library");
            setError("Failed to load QR scanning library");
          };
          document.head.appendChild(script);
        } catch (err) {
          console.error("Error loading QR library:", err);
          setError("Failed to load QR scanning library");
        }
      } else if (window.Html5Qrcode) {
        setLibraryLoaded(true);
      }
    };

    loadQRLibrary();
  }, []);

  useEffect(() => {
    if (isOpen && libraryLoaded) {
      // Reset state when opening
      setError(null);
      setSuccess(false);
      setScanning(false);
      setHasPermission(null);

      const timer = setTimeout(() => {
        initScanner();
      }, 500);

      return () => {
        clearTimeout(timer);
      };
    } else if (!isOpen) {
      stopScanner();
    }
  }, [isOpen, libraryLoaded]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const initScanner = async () => {
    if (!window.Html5Qrcode) {
      setError("QR scanner library is not loaded");
      return;
    }

    try {
      // Check if container exists
      const container = document.getElementById(scannerContainerId);
      if (!container) {
        setError("QR scanner container not found. Please try again.");
        return;
      }

      // Stop any existing scanner first
      if (scannerRef.current) {
        try {
          await stopScanner();
        } catch (e) {
          console.warn("Error stopping existing scanner:", e);
        }
      }

      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      // Clear any existing content in the container after stopping
      container.innerHTML = "";

      console.log("Initializing QR scanner...");

      // Create new scanner instance
      scannerRef.current = new window.Html5Qrcode(scannerContainerId);

      setScanning(true);
      setHasPermission(null);

      console.log("Starting camera...");

      // Get available cameras first
      const cameras = await window.Html5Qrcode.getCameras();

      if (cameras && cameras.length > 0) {
        // Try to use back camera first, fallback to first available camera
        const backCamera = cameras.find(
          (camera: any) =>
            camera.label && camera.label.toLowerCase().includes("back")
        );
        const cameraId = backCamera ? backCamera.id : cameras[0].id;

        // Start scanning with the selected camera - higher FPS and optimized settings for faster scanning
        await scannerRef.current.start(
          cameraId,
          {
            fps: 30, // Even higher frame rate for faster scanning
            qrbox: { width: 300, height: 300 }, // Larger scan area
            aspectRatio: 1.0,
            disableFlip: false, // Allow both normal and mirrored QR codes
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true, // Use native API if available
            },
            rememberLastUsedCamera: true,
            formatsToSupport: [0], // 0 is QR Code format only - focusing on just QR codes improves speed
          },
          (decodedText: string) => onScanSuccess(decodedText),
          (errorMessage: string) => {
            // This fires frequently when no QR is detected, so we don't log it
            // console.log("Scan error:", errorMessage);
          }
        );

        console.log("Camera started successfully");
        setHasPermission(true);
        setError(null);
      } else {
        throw new Error("No cameras found");
      }
    } catch (err: any) {
      console.error("Error initializing QR scanner:", err);
      setHasPermission(false);
      setScanning(false);

      // Handle specific error messages
      if (
        err.name === "NotAllowedError" ||
        err.message.includes("Permission denied")
      ) {
        setError(
          "Camera permission denied. Please allow camera access and try again."
        );
      } else if (err.name === "NotFoundError") {
        setError("No camera found. Please ensure your device has a camera.");
      } else if (err.name === "NotSupportedError") {
        setError(
          "Camera not supported in this browser. Please try a different browser."
        );
      } else {
        setError(`Scanner error: ${err.message || "Failed to start camera"}`);
      }
    }
  };

  const onScanSuccess = (decodedText: string) => {
    console.log(`QR Code detected: ${decodedText}`);

    // Stop scanning immediately to prevent multiple scans
    setScanning(false);

    // Stop the scanner to prevent multiple scans
    stopScanner();

    // Immediately pass the scanned code to parent for backend validation
    // without closing the modal or showing success yet
    onSuccess(decodedText);
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        console.log("Stopping scanner...");

        // Check if scanner is currently scanning
        if (
          scannerRef.current.getState &&
          scannerRef.current.getState() ===
            window.Html5Qrcode?.ScannerState?.SCANNING
        ) {
          await scannerRef.current.stop();
          console.log("Scanner stopped successfully");
        }

        // Clear the scanner
        if (scannerRef.current.clear) {
          scannerRef.current.clear();
        }

        scannerRef.current = null;
      }

      // Clear the container
      const container = document.getElementById(scannerContainerId);
      if (container) {
        container.innerHTML = "";
      }
    } catch (err) {
      console.error("Error stopping scanner:", err);
      // Force clear the container even if stop fails
      const container = document.getElementById(scannerContainerId);
      if (container) {
        container.innerHTML = "";
      }
    }
  };

  const handleClose = () => {
    stopScanner();
    setError(null);
    setSuccess(false);
    setScanning(false);
    setHasPermission(null);
    onClose();
  };

  const retryScanning = async () => {
    setError(null);
    setHasPermission(null);
    setScanning(false);

    // Stop current scanner
    await stopScanner();

    // Wait a bit then restart
    setTimeout(() => {
      initScanner();
    }, 1000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            QR Code Verification
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-4 top-4"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Scan the QR code to verify order delivery
            </p>
            <Badge variant="outline" className="mt-2">
              Order: {orderCode}
            </Badge>
          </div>

          {/* QR Scanner Container */}
          <div
            className="relative rounded-md overflow-hidden"
            style={{ 
              minHeight: "300px", 
              position: "relative",
              backgroundColor: "#000"
            }}
          >
            {/* The scanner will be rendered in this element */}
            <div
              id={scannerContainerId}
              style={{ 
                width: "100%",
                minHeight: "300px",
                lineHeight: 0
              }}
            ></div>

            {/* Loading State */}
            {!libraryLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p>Loading QR scanner...</p>
                </div>
              </div>
            )}

            {/* Camera Permission Request */}
            {libraryLoaded && hasPermission === null && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p>Requesting camera access...</p>
                  <p className="text-xs mt-2">Please allow camera permission</p>
                </div>
              </div>
            )}

            {/* Permission Denied */}
            {hasPermission === false && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90">
                <div className="text-center text-white max-w-xs px-4">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 text-red-500" />
                  <p className="font-medium mb-2">Camera Access Required</p>
                  <p className="text-xs mb-4">
                    Please allow camera permission in your browser to scan QR
                    codes
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white text-white hover:bg-white hover:text-black"
                    onClick={retryScanning}
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {/* Success State */}
            {success && (
              <div className="absolute inset-0 flex items-center justify-center bg-green-600 bg-opacity-90">
                <div className="text-white text-center">
                  <CheckCircle className="h-16 w-16 mx-auto mb-4" />
                  <p className="text-lg font-semibold mb-2">
                    Order Verified Successfully!
                  </p>
                  <p className="text-sm">Updating order status...</p>
                </div>
              </div>
            )}

            {/* Validating State - When backend validation is in progress */}
            {isValidating && !success && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-4"></div>
                  <p className="text-lg font-semibold mb-2">
                    Verifying QR Code...
                  </p>
                  <p className="text-sm">Checking with the server</p>
                </div>
              </div>
            )}

            {/* Scanning Indicator */}
            {scanning && hasPermission && !success && !error && (
              <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
                Scanning...
              </div>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={retryScanning}
              disabled={
                !libraryLoaded || (scanning && !error && hasPermission === true) || isValidating
              }
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {!libraryLoaded
                ? "Loading..."
                : scanning && !error && hasPermission === true
                ? "Scanning..."
                : "Start Scanning"}
            </Button>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isValidating}
              className="border-primary/20 hover:bg-primary/5 hover:text-primary"
            >
              Cancel
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            Point your camera at the QR code for order {orderCode}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRScannerModal;
