"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
  LayersControl,
  ZoomControl,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Search,
  MapPin,
  Loader2,
  Navigation,
  Check,
  Layers,
  Info,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

// Fix Leaflet marker icon issue
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Marker for Satellite View (better visibility)
const SatelliteIcon = L.divIcon({
  className: "custom-div-icon",
  html: `
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" fill="#FF4444" stroke="#FFFFFF" stroke-width="3"/>
      <circle cx="20" cy="20" r="8" fill="#FFFFFF"/>
      <circle cx="20" cy="20" r="4" fill="#FF4444"/>
    </svg>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

interface AddressDetails {
  streetAddress: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

interface LeafletMapProps {
  onLocationSelect: (location: AddressDetails) => void;
  initialLocation?: { lat: number; lng: number };
}

function ChangeView({
  center,
  zoom,
}: {
  center: [number, number];
  zoom?: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom || map.getZoom(), { animate: true });
  }, [center, zoom, map]);
  return null;
}

function LocationMarker({
  position,
  onPositionChange,
}: {
  position: [number, number] | null;
  onPositionChange: (pos: [number, number]) => void;
}) {
  useMapEvents({
    click(e) {
      onPositionChange([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position === null ? null : (
    <Marker
      position={position}
      icon={SatelliteIcon}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const pos = marker.getLatLng();
          onPositionChange([pos.lat, pos.lng]);
        },
      }}
    />
  );
}

export function LeafletMap({
  onLocationSelect,
  initialLocation,
}: LeafletMapProps) {
  const [position, setPosition] = useState<[number, number]>(
    initialLocation
      ? [initialLocation.lat, initialLocation.lng]
      : [-1.9441, 30.0619], // Default to Kigali
  );
  const [zoom, setZoom] = useState(13);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<AddressDetails | null>(
    null,
  );

  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionContainerRef = useRef<HTMLDivElement>(null);

  const parseNominatimAddress = (
    data: any,
    lat: number,
    lng: number,
  ): AddressDetails => {
    const addr = data.address || {};
    const street = addr.road || addr.street || addr.suburb || "";
    const city = addr.city || addr.town || addr.village || addr.suburb || "";
    const state = addr.state || addr.region || addr.province || "";
    const country = addr.country || "";

    return {
      streetAddress: street,
      city,
      state,
      country,
      latitude: lat,
      longitude: lng,
      formattedAddress: data.display_name,
    };
  };

  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        );
        const data = await response.json();

        const details = parseNominatimAddress(data, lat, lng);
        setSelectedAddress(details);
        setSearchQuery(details.formattedAddress);
        onLocationSelect(details);
      } catch (error) {
        console.error("Error in reverse geocoding:", error);
        toast.error("Unable to retrieve address for this location.");
      } finally {
        setIsLoading(false);
      }
    },
    [onLocationSelect],
  );

  const handleSearch = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      setIsSearching(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
      );
      const data = await response.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Error in address search:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSuggestionSelect = (suggestion: any) => {
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);
    const newPos: [number, number] = [lat, lng];

    setPosition(newPos);
    setZoom(18);
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchQuery(suggestion.display_name);

    const details = parseNominatimAddress(suggestion, lat, lng);
    setSelectedAddress(details);
    onLocationSelect(details);
    toast.success(`📍 Navigated to ${suggestion.display_name.split(",")[0]}`);
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos: [number, number] = [
          pos.coords.latitude,
          pos.coords.longitude,
        ];
        setPosition(newPos);
        setZoom(18);
        reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Unable to get your current location.");
        setIsLoading(false);
      },
      { enableHighAccuracy: true },
    );
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionContainerRef.current &&
        !suggestionContainerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search for an address, landmark, or area..."
              className="pl-9 pr-10"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearch(e.target.value);
              }}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleCurrentLocation}
            title="Use My Location"
          >
            <Navigation className="h-4 w-4" />
          </Button>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <Card
            ref={suggestionContainerRef}
            className="absolute z-[1000] w-full mt-1 overflow-hidden shadow-lg border animate-in fade-in slide-in-from-top-2"
          >
            <div className="px-3 py-2 bg-muted/50 border-b flex items-center gap-2">
              <Info className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Suggestions
              </span>
            </div>
            <div className="max-h-[250px] overflow-auto">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  className="w-full text-left px-4 py-3 hover:bg-accent text-sm border-b last:border-0 transition-colors flex items-start gap-3"
                  onClick={() => handleSuggestionSelect(s)}
                >
                  <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {s.display_name.split(",")[0]}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {s.display_name.split(",").slice(1).join(",").trim()}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Map Container */}
      <div className="relative group">
        <div className="h-[450px] w-full rounded-lg border shadow-sm overflow-hidden z-0">
          <MapContainer
            center={position}
            zoom={zoom}
            zoomControl={false}
            style={{ height: "100%", width: "100%" }}
          >
            <LayersControl position="topright">
              <LayersControl.BaseLayer
                checked
                name="Hybrid (Satellite + Roads)"
              >
                <TileLayer
                  attribution="&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/layers/base/{z}/{x}/{y}.png"
                  opacity={0.3}
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Satellite Only">
                <TileLayer
                  attribution="&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Street Map">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              </LayersControl.BaseLayer>
            </LayersControl>

            <ZoomControl position="bottomright" />
            <ChangeView center={position} zoom={zoom} />

            <LocationMarker
              position={position}
              onPositionChange={(pos) => {
                setPosition(pos);
                reverseGeocode(pos[0], pos[1]);
              }}
            />
          </MapContainer>

          {/* Overlay Info */}
          <div className="absolute top-3 left-3 z-[400] pointer-events-none">
            <div className="bg-background/90 backdrop-blur-sm border rounded-md p-2 shadow-md flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Live Satellite
              </span>
            </div>
          </div>

          {isLoading && (
            <div className="absolute inset-0 bg-background/20 backdrop-blur-[1px] z-[1001] flex items-center justify-center transition-all">
              <div className="bg-background/80 p-4 rounded-full shadow-lg border">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selected Address Display (matching Google pattern) */}
      {selectedAddress && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-3 flex items-start gap-3">
            <div className="bg-green-100 p-2 rounded-full">
              <Check className="h-4 w-4 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-green-900">
                Location Selected
              </p>
              <p className="text-xs text-green-700 leading-tight mt-0.5 line-clamp-2">
                {selectedAddress.formattedAddress}
              </p>
              <p className="text-[10px] text-green-600 font-mono mt-1">
                {selectedAddress.latitude.toFixed(6)},{" "}
                {selectedAddress.longitude.toFixed(6)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
