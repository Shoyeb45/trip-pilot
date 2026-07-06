import L from "leaflet";

export const createPinIcon = (colorHex: string, iconSvg: string) => {
  return L.divIcon({
    html: `
      <div style="position: relative; width: 32px; height: 40px; display: flex; align-items: center; justify-content: center;">
        <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 3px 4px rgba(0, 0, 0, 0.4));">
          <path d="M16 0C7.16 0 0 7.16 0 16c0 11.25 16 24 16 24s16-12.75 16-24C32 7.16 24.84 0 16 0z" fill="${colorHex}"/>
          <circle cx="16" cy="16" r="10" fill="#ffffff"/>
        </svg>
        <div style="position: absolute; top: 8px; left: 8px; color: ${colorHex}; display: flex; align-items: center; justify-content: center; width: 16px; height: 16px;">
          ${iconSvg}
        </div>
      </div>
    `,
    className: "custom-pin-icon",
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -36],
  });
};
