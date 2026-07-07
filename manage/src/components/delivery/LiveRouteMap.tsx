"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Navigation,
  Satellite,
  Map as MapIcon,
  AlertCircle,
  Eye,
} from "lucide-react";
import { Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LiveRouteMapProps {
  destinationAddress: string;
  destinationName?: string;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export default function LiveRouteMap({
  destinationAddress,
  destinationName = "Delivery Location",
}: LiveRouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [status, setStatus] = useState("Initializing...");
  const [distance, setDistance] = useState("—");
  const [duration, setDuration] = useState("—");
  const [isSatellite, setIsSatellite] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStreetView, setIsStreetView] = useState(false);
  const streetViewRef = useRef<any>(null);

  const userMarkerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const currentPositionRef = useRef<any>(null);
  const lastRouteTimeRef = useRef<number>(0);
  const isFirstLocationRef = useRef<boolean>(true);
  const mapBoundsSetRef = useRef<boolean>(false);

  const ROUTE_UPDATE_INTERVAL_MS = 5000;

  useEffect(() => {
    // Load Google Maps script
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        setIsMapLoaded(true);
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => setIsMapLoaded(true);
      script.onerror = () => {
        setError("Failed to load Google Maps");
        setStatus("Map loading failed");
      };
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, []);

  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return;

    initializeMap();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isMapLoaded, destinationAddress]);

  const initializeMap = () => {
    if (!window.google || !mapRef.current) return;

    try {
      const mapInstance = new window.google.maps.Map(mapRef.current, {
        center: { lat: -1.95, lng: 30.06 }, // Default to Kigali
        zoom: 15,
        mapTypeId: "roadmap",
        streetViewControl: true,
        fullscreenControl: false,
        mapTypeControl: false,
        zoomControl: true,
      });

      setMap(mapInstance);

      // Listen for Street View visibility changes
      const panorama = mapInstance.getStreetView();
      streetViewRef.current = panorama;
      window.google.maps.event.addListener(panorama, "visible_changed", () => {
        setIsStreetView(panorama.getVisible());
      });

      // Initialize directions renderer with preserveViewport to prevent map resizing
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer(
        {
          map: mapInstance,
          suppressMarkers: true,
          preserveViewport: true, // Keep viewport stable during route updates
          polylineOptions: {
            strokeWeight: 5,
            strokeColor: "#4285F4",
            clickable: false,
          },
        },
      );

      // Create user marker
      userMarkerRef.current = new window.google.maps.Marker({
        map: mapInstance,
        title: "Your Location",
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#4285F4",
          fillOpacity: 1,
          strokeWeight: 3,
          strokeColor: "#fff",
        },
        zIndex: 1000,
      });

      // Create accuracy circle
      accuracyCircleRef.current = new window.google.maps.Circle({
        map: mapInstance,
        fillColor: "#4285F4",
        fillOpacity: 0.15,
        strokeWeight: 1,
        strokeColor: "#4285F4",
        strokeOpacity: 0.3,
        radius: 0,
      });

      // Add destination marker
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode(
        { address: destinationAddress },
        (results: any, status: any) => {
          if (status === "OK" && results[0]) {
            new window.google.maps.Marker({
              map: mapInstance,
              position: results[0].geometry.location,
              title: destinationName,
              icon: {
                path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                scale: 7,
                fillColor: "#EA4335",
                fillOpacity: 1,
                strokeColor: "#fff",
                strokeWeight: 2,
              },
              zIndex: 999,
            });
          }
        },
      );

      startTracking();
    } catch (err) {
      console.error("Error initializing map:", err);
      setError("Failed to initialize map");
    }
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      setStatus("Geolocation not supported");
      setError("Your browser doesn't support geolocation");
      return;
    }

    setStatus("Acquiring high-accuracy GPS location...");

    // First, get a quick initial position
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const position = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        currentPositionRef.current = position;

        // Immediately center map on first location
        if (map && isFirstLocationRef.current) {
          map.setCenter(position);
          map.setZoom(16);
          isFirstLocationRef.current = false;
        }

        // Update marker
        if (userMarkerRef.current) {
          userMarkerRef.current.setPosition(position);
        }

        setStatus(
          `Initial location acquired — accuracy ±${Math.round(pos.coords.accuracy)}m`,
        );
      },
      (err) => console.warn("Initial position error:", err),
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      },
    );

    // Then start continuous high-accuracy tracking
    watchIdRef.current = navigator.geolocation.watchPosition(
      onPositionUpdate,
      onPositionError,
      {
        enableHighAccuracy: true, // Use GPS for best accuracy
        maximumAge: 0, // Don't use cached positions
        timeout: 15000, // Give more time for GPS lock
      },
    );
  };

  const onPositionUpdate = (pos: GeolocationPosition) => {
    const position = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
    };
    const accuracy = pos.coords.accuracy;

    currentPositionRef.current = position;

    // Update user marker and accuracy circle
    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition(position);
    }
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setCenter(position);
      accuracyCircleRef.current.setRadius(accuracy);
    }

    // Show accuracy status with color coding
    let accuracyStatus = "";
    if (accuracy < 20) {
      accuracyStatus = "🟢 Excellent accuracy";
    } else if (accuracy < 50) {
      accuracyStatus = "🟡 Good accuracy";
    } else if (accuracy < 100) {
      accuracyStatus = "🟠 Fair accuracy";
    } else {
      accuracyStatus = "🔴 Low accuracy";
    }
    setStatus(`${accuracyStatus} — ±${Math.round(accuracy)}m`);

    // Only pan map on first location or if user manually recentered
    // Don't auto-pan during route updates to keep viewport stable
    if (isFirstLocationRef.current && map) {
      map.panTo(position);
      map.setZoom(16);
      isFirstLocationRef.current = false;

      // Set initial bounds to include both user and destination
      if (!mapBoundsSetRef.current) {
        setTimeout(() => {
          const bounds = new window.google.maps.LatLngBounds();
          bounds.extend(position);
          // We'll extend to destination when route is calculated
          mapBoundsSetRef.current = true;
        }, 1000);
      }
    }

    // Update route periodically
    const now = Date.now();
    if (now - lastRouteTimeRef.current > ROUTE_UPDATE_INTERVAL_MS) {
      updateRoute(position);
      lastRouteTimeRef.current = now;
    }
  };

  const updateRoute = (origin: { lat: number; lng: number }) => {
    if (!window.google) return;

    const directionsService = new window.google.maps.DirectionsService();
    const request = {
      origin,
      destination: destinationAddress,
      travelMode: window.google.maps.TravelMode.DRIVING,
      unitSystem: window.google.maps.UnitSystem.METRIC,
    };

    directionsService.route(request, (result: any, status: any) => {
      if (status === "OK" && result) {
        directionsRendererRef.current?.setDirections(result);
        const leg = result.routes[0].legs[0];
        if (leg.distance) {
          const km = (leg.distance.value / 1000).toFixed(2);
          setDistance(`${km} km`);
        }
        if (leg.duration) {
          setDuration(leg.duration.text);
        }
      }
    });
  };

  const onPositionError = (err: GeolocationPositionError) => {
    const messages: { [key: number]: string } = {
      1: "Permission denied. Please allow location access.",
      2: "Position unavailable.",
      3: "Timeout. Try again.",
    };
    const message = messages[err.code] || "Error getting location.";
    setStatus(message);
    setError(message);
  };

  const handleRecenter = () => {
    if (currentPositionRef.current && map) {
      map.panTo(currentPositionRef.current);
      map.setZoom(16);
      // Allow auto-pan for a moment after manual recenter
      isFirstLocationRef.current = true;
      setTimeout(() => {
        isFirstLocationRef.current = false;
      }, 3000);
    }
  };

  const handleRecalculateRoute = () => {
    if (currentPositionRef.current) {
      updateRoute(currentPositionRef.current);
      setStatus("Recalculating route...");
    }
  };

  const handleToggleView = () => {
    if (map) {
      const newType = isSatellite ? "roadmap" : "hybrid";
      map.setMapTypeId(newType);
      setIsSatellite(!isSatellite);
    }
  };

  const handleExitStreetView = () => {
    if (streetViewRef.current) {
      streetViewRef.current.setVisible(false);
      setIsStreetView(false);
    }
  };

  if (error && !isMapLoaded) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-semibold">Map Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Control Panel - Outside Map for Better Visibility */}
      {isMapLoaded && (
        <Card className="bg-white shadow-md">
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Status */}
              <div className="flex items-start gap-2">
                <Navigation className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{status}</p>
                </div>
              </div>

              {/* Destination */}
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{destinationName}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {destinationAddress}
                  </p>
                </div>
              </div>

              {/* Distance & Duration */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div className="bg-green-50 p-2 rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Distance</p>
                  <p className="text-lg font-bold text-primary">{distance}</p>
                </div>
                <div className="bg-green-50 p-2 rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Duration</p>
                  <p className="text-lg font-bold text-green-600">{duration}</p>
                </div>
              </div>

              {/* Controls with Tooltips */}
              <TooltipProvider>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRecenter}
                        disabled={!currentPositionRef.current}
                        className="h-9"
                      >
                        <Navigation className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Re-center map to your location</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRecalculateRoute}
                        disabled={!currentPositionRef.current}
                        className="h-9"
                      >
                        <MapPin className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Recalculate route</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleToggleView}
                        className="h-9"
                      >
                        {isSatellite ? (
                          <MapIcon className="h-4 w-4" />
                        ) : (
                          <Satellite className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {isSatellite
                          ? "Switch to Road Map"
                          : "Switch to Satellite View"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>

              {/* Info */}
              <p className="text-xs text-center text-muted-foreground pt-2 border-t">
                🔄 Route updates automatically every 5 seconds
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Map Container */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="relative w-full h-[400px] md:h-[500px] lg:h-[600px]">
            {!isMapLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Loading map...
                  </p>
                </div>
              </div>
            )}
            <div ref={mapRef} className="w-full h-full" />

            {/* Street View Exit Button */}
            {isStreetView && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleExitStreetView}
                        className="shadow-lg bg-white hover:bg-gray-100 text-gray-900 border-2 border-primary"
                        size="lg"
                      >
                        <Eye className="h-5 w-5 mr-2" />
                        Exit Street View
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Return to top-down map view</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}

            {/* Attribution */}
            <div className="absolute bottom-2 right-2 bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-muted-foreground">
              © Google Maps
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
