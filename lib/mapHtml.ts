import { LANDMARKS, REPORT_TYPE_META, FLOW_LEVEL_META, KNUST_CENTER, KNUST_ZOOM } from '@/lib/constants';

/**
 * Builds the static HTML shell for the campus map, loaded once into the
 * WebView. All dynamic data (reports, ambient readings, routes) is pushed in
 * afterwards via `postMessage` from the native side — see MapWebView.tsx.
 *
 * This deliberately reuses the same tile provider, colors, and popup content
 * as the original web app's Leaflet map, so behavior stays consistent between
 * the two versions of the app.
 */
export function buildMapHtml(): string {
  const landmarksJson = JSON.stringify(LANDMARKS);
  const reportMetaJson = JSON.stringify(REPORT_TYPE_META);
  const flowMetaJson = JSON.stringify(FLOW_LEVEL_META);
  const [centerLat, centerLng] = KNUST_CENTER;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #020617; }
    .leaflet-popup-content-wrapper { background: #ffffff; border-radius: 12px; }
    .leaflet-popup-content { margin: 10px 12px; font-family: -apple-system, sans-serif; }
    .leaflet-tooltip { font-family: -apple-system, sans-serif; font-size: 11px; }
    .popup-title { font-weight: 700; color: #0f172a; font-size: 13px; display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
    .popup-row { font-size: 11px; color: #475569; margin-top: 2px; }
    .popup-badge { display: inline-block; padding: 2px 8px; border-radius: 999px; color: white; font-weight: 700; font-size: 10px; }
    .popup-bar-track { height: 6px; border-radius: 999px; background: #e2e8f0; overflow: hidden; margin-top: 4px; }
    .popup-bar-fill { height: 100%; border-radius: 999px; }
    .popup-btn { margin-top: 8px; width: 100%; border: none; border-radius: 8px; padding: 8px; font-size: 12px; font-weight: 600; color: white; background: linear-gradient(90deg, #168A76, #1BA88F); }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const LANDMARKS = ${landmarksJson};
    const REPORT_TYPE_META = ${reportMetaJson};
    const FLOW_LEVEL_META = ${flowMetaJson};

    const map = L.map('map', { zoomControl: false, attributionControl: true }).setView([${centerLat}, ${centerLng}], ${KNUST_ZOOM});

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS community &middot; Traffic data &copy; Google',
      maxZoom: 19,
    }).addTo(map);

    // Labels/roads overlay on top of the raw satellite imagery, so street
    // names and place labels are still readable (same "hybrid" look Google
    // Maps uses for its satellite view).
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
    }).addTo(map);

    // Static landmark dots (always visible, low emphasis)
    LANDMARKS.forEach((lm) => {
      L.circleMarker([lm.lat, lm.lng], {
        radius: 5, color: '#ffffff', weight: 1.5, fillColor: '#0f172a', fillOpacity: 0.85,
      }).addTo(map).bindTooltip(lm.name, { direction: 'top', offset: [0, -8] });
    });

    let ambientLayer = L.layerGroup().addTo(map);
    let reportsLayer = L.layerGroup().addTo(map);
    let routeLayer = L.layerGroup().addTo(map);
    let userMarker = null;
    let userAccuracyCircle = null;
    let followMode = false;
    let showAmbient = true;
    let showReports = true;

    function post(msg) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    }

    function renderAmbient(readings) {
      ambientLayer.clearLayers();
      if (!showAmbient) return;
      readings.forEach((rd) => {
        const meta = FLOW_LEVEL_META[rd.flow_level] || FLOW_LEVEL_META.free;
        const radius = 5 + Math.round(rd.congestion_pct / 12);
        const marker = L.circleMarker([rd.latitude, rd.longitude], {
          radius, color: meta.color, weight: 1.5, fillColor: meta.color, fillOpacity: 0.35, dashArray: '4 3',
        });
        const sourceLine = rd.source === 'estimated'
          ? '<div class="popup-row" style="color:#d97706;font-weight:600;">Estimated &middot; no route data available here yet</div>'
          : '<div class="popup-row">Live traffic-aware route data by Google</div>';
        const closureLine = rd.road_closed
          ? '<div class="popup-row" style="background:#fef2f2;color:#dc2626;font-weight:700;padding:4px 6px;border-radius:6px;margin-top:6px;">Road closure reported</div>'
          : '';
        marker.bindPopup(
          '<div style="min-width:190px;">' +
            '<div class="popup-title">' + rd.name + '</div>' +
            '<div><span class="popup-badge" style="background:' + meta.color + '">' + meta.label + '</span> <span class="popup-row" style="display:inline;">' + rd.speed_kmh + ' km/h</span></div>' +
            '<div class="popup-bar-track"><div class="popup-bar-fill" style="width:' + rd.congestion_pct + '%;background:' + meta.color + '"></div></div>' +
            '<div class="popup-row">' + rd.congestion_pct + '% congested</div>' +
            closureLine + sourceLine +
          '</div>'
        );
        marker.bindTooltip(rd.name + ' &middot; ' + meta.label, { direction: 'top', offset: [0, -8] });
        marker.addTo(ambientLayer);
      });
    }

    function renderReports(reports) {
      reportsLayer.clearLayers();
      if (!showReports) return;
      reports.forEach((r) => {
        const meta = REPORT_TYPE_META[r.report_type];
        const intensity = Math.min(r.active_votes, 8);
        const marker = L.circleMarker([r.latitude, r.longitude], {
          radius: 8 + intensity, color: meta.color, weight: 2, fillColor: meta.color, fillOpacity: 0.55,
        });
        marker.bindPopup(
          '<div style="min-width:190px;">' +
            '<div class="popup-title">' + meta.icon + ' ' + meta.label + '</div>' +
            (r.landmark ? '<div class="popup-row" style="font-weight:600;color:#334155;">' + r.landmark + '</div>' : '') +
            (r.description ? '<div class="popup-row">' + r.description + '</div>' : '') +
            '<div class="popup-row" style="color:#059669;font-weight:600;">' + r.active_votes + ' active votes</div>' +
            '<button class="popup-btn" onclick="window.__selectReport(\\'' + r.id + '\\')">View details</button>' +
          '</div>'
        );
        marker.addTo(reportsLayer);
      });
    }

    window.__selectReport = function (id) {
      post({ type: 'selectReport', id });
    };

    function renderRoute(route) {
      routeLayer.clearLayers();
      if (!route) return;
      const { primaryCoords, altCoords } = route;
      if (altCoords && altCoords.length > 0) {
        L.polyline(altCoords, { color: '#38bdf8', weight: 5, opacity: 0.55, dashArray: '12 8' }).addTo(routeLayer);
      }
      if (primaryCoords && primaryCoords.length > 0) {
        L.polyline(primaryCoords, { color: '#168A76', weight: 6, opacity: 0.85 }).addTo(routeLayer);
        L.circleMarker(primaryCoords[0], { radius: 8, color: '#168A76', fillColor: '#168A76', fillOpacity: 0.9, weight: 3 })
          .addTo(routeLayer).bindTooltip('Start', { direction: 'top', permanent: false });
        L.circleMarker(primaryCoords[primaryCoords.length - 1], { radius: 8, color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.9, weight: 3 })
          .addTo(routeLayer).bindTooltip('Destination', { direction: 'top', permanent: false });
        const all = altCoords && altCoords.length > 0 ? primaryCoords.concat(altCoords) : primaryCoords;
        map.fitBounds(L.latLngBounds(all), { padding: [60, 60], maxZoom: 17 });
      }
    }

    function renderUserLocation(lat, lng, accuracy, heading) {
      if (!userMarker) {
        userMarker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: '',
            html: '<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 2px rgba(59,130,246,0.4), 0 2px 6px rgba(0,0,0,0.4);"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          }),
          zIndexOffset: 1000,
        }).addTo(map);
      } else {
        userMarker.setLatLng([lat, lng]);
      }

      if (accuracy) {
        if (!userAccuracyCircle) {
          userAccuracyCircle = L.circle([lat, lng], {
            radius: accuracy, color: '#3b82f6', weight: 1, fillColor: '#3b82f6', fillOpacity: 0.12,
          }).addTo(map);
        } else {
          userAccuracyCircle.setLatLng([lat, lng]);
          userAccuracyCircle.setRadius(accuracy);
        }
      }

      if (followMode) {
        map.panTo([lat, lng], { animate: true, duration: 0.5 });
      }
    }

    function setFollowMode(value, lat, lng) {
      followMode = value;
      if (followMode && lat !== undefined) {
        map.flyTo([lat, lng], 17, { duration: 0.8 });
      }
    }

    function handleMessage(event) {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'data') {
          renderAmbient(msg.readings || []);
          renderReports(msg.reports || []);
        } else if (msg.type === 'route') {
          renderRoute(msg.route);
        } else if (msg.type === 'toggleAmbient') {
          showAmbient = msg.value;
          renderAmbient(msg.readings || []);
        } else if (msg.type === 'toggleReports') {
          showReports = msg.value;
          renderReports(msg.reports || []);
        } else if (msg.type === 'recenter') {
          map.flyTo([msg.lat, msg.lng], 16, { duration: 1 });
        } else if (msg.type === 'userLocation') {
          renderUserLocation(msg.lat, msg.lng, msg.accuracy, msg.heading);
        } else if (msg.type === 'followMode') {
          setFollowMode(msg.value, msg.lat, msg.lng);
        }
      } catch (e) {
        post({ type: 'error', message: String(e) });
      }
    }

    document.addEventListener('message', handleMessage);
    window.addEventListener('message', handleMessage);

    post({ type: 'ready' });
  </script>
</body>
</html>`;
}
