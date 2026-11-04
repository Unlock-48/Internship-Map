"use client";

import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import { Company } from "@/types/domain";
import { provinceCoordinates } from "@/lib/province-coordinates";

function markerIconFor(organizationType: string) {
  const markerClass = organizationType === "ภาคเอกชน"
    ? "private"
    : organizationType === "ภาครัฐ"
      ? "government"
      : organizationType === "Software House"
        ? "software"
        : "unknown";
  return L.divIcon({
    className: `real-map-marker ${markerClass}`,
    html: "<span>•</span>",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
  });
}

const userIcon = L.divIcon({
  className: "user-location-marker",
  html: "<span></span>",
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

function MapController({ location, selectedCompany, province }: { location: [number, number] | null; selectedCompany?: Company; province: string }) {
  const map = useMap();
  useEffect(() => {
    if (province && provinceCoordinates[province]) map.flyTo(provinceCoordinates[province], 10, { duration: 1 });
  }, [map, province]);
  useEffect(() => {
    if (location) map.flyTo(location, 15, { duration: 1 });
  }, [location, map]);
  useEffect(() => {
    if (selectedCompany?.latitude != null && selectedCompany.longitude != null) {
      map.flyTo([selectedCompany.latitude, selectedCompany.longitude], 16, { duration: 1 });
    }
  }, [map, selectedCompany]);
  return null;
}

export function MapView({ companies, selectedCompanyId, onSelect, province = "เชียงใหม่" }: { companies: Company[]; selectedCompanyId?: string; onSelect: (id: string) => void; province?: string }) {
  const mappedCompanies = companies.filter((company) => company.latitude != null && company.longitude != null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationStatus, setLocationStatus] = useState("");
  const markerRefs = useRef<Record<string, L.Marker | null>>({});
  const selectedCompany = companies.find((company) => company.id === selectedCompanyId);

  useEffect(() => {
    if (selectedCompanyId && selectedCompany?.latitude == null) {
      setLocationStatus("บริษัทนี้ยังไม่มีพิกัด");
    }
    if (selectedCompany?.latitude != null && selectedCompany.longitude != null) {
      markerRefs.current[selectedCompany.id]?.openPopup();
    }
  }, [selectedCompany, selectedCompanyId]);

  function showCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง");
      return;
    }
    setLocationStatus("กำลังค้นหาตำแหน่ง...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
        setLocationStatus("แสดงตำแหน่งปัจจุบันแล้ว");
      },
      () => setLocationStatus("ไม่สามารถเข้าถึงตำแหน่งได้ กรุณาอนุญาต Location"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  return (
    <div className="map real-map" aria-label="แผนที่สถานที่ฝึกงานจังหวัดเชียงใหม่">
      <MapContainer center={provinceCoordinates["เชียงใหม่"]} zoom={10} scrollWheelZoom className="leaflet-map">
        <MapController location={userLocation} selectedCompany={selectedCompany} province={province} />
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {mappedCompanies.map((company) => (
          <Marker ref={(marker) => { markerRefs.current[company.id] = marker; }} key={company.id} position={[company.latitude!, company.longitude!]} icon={markerIconFor(company.organizationType)} eventHandlers={{ click: () => onSelect(company.id) }}>
            <Popup>
              <button className="map-company-link" type="button" onClick={() => onSelect(company.id)}>{company.name}</button>
              <br />{company.organizationType || "ไม่ระบุ"} · {company.businessType || "ไม่ระบุประเภทกิจการ"}
            </Popup>
          </Marker>
        ))}
        {userLocation && <Marker position={userLocation} icon={userIcon}><Popup>ตำแหน่งปัจจุบันของคุณ</Popup></Marker>}
      </MapContainer>
      <button className="location-button" type="button" onClick={showCurrentLocation}>⌖ ตำแหน่งของฉัน</button>
      {locationStatus && <div className="location-status" role="status">{locationStatus}</div>}
      <div className="map-note">{companies.length - mappedCompanies.length ? `อีก ${companies.length - mappedCompanies.length} บริษัท ยังไม่มีพิกัด` : "แสดงตำแหน่งจากพิกัดใน Supabase"}</div>
    </div>
  );
}
