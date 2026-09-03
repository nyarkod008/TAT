import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { buildMapHtml } from '@/lib/mapHtml';
import { routeCoords } from '@/lib/routing';
import type { RouteResult } from '@/lib/routing';
import type { TrafficReport, TrafficReading } from '@/types';

interface MapWebViewProps {
  reports: TrafficReport[];
  readings: TrafficReading[];
  showAmbient: boolean;
  showReports: boolean;
  primaryRoute?: RouteResult | null;
  alternateRoute?: RouteResult | null;
  onSelectReport: (id: string) => void;
}

export interface MapWebViewHandle {
  recenter: (lat: number, lng: number) => void;
  sendUserLocation: (lat: number, lng: number, accuracy?: number, heading?: number) => void;
  setFollowMode: (value: boolean, lat?: number, lng?: number) => void;
}

const html = buildMapHtml();

const MapWebView = forwardRef<MapWebViewHandle, MapWebViewProps>(function MapWebView(
  { reports, readings, showAmbient, showReports, primaryRoute, alternateRoute, onSelectReport },
  ref
) {
  const webviewRef = useRef<WebView>(null);
  const [mapReady, setMapReady] = useState(false);

  const post = (msg: unknown) => {
    webviewRef.current?.postMessage(JSON.stringify(msg));
  };

  useImperativeHandle(ref, () => ({
    recenter: (lat: number, lng: number) => post({ type: 'recenter', lat, lng }),
    sendUserLocation: (lat: number, lng: number, accuracy?: number, heading?: number) =>
      post({ type: 'userLocation', lat, lng, accuracy, heading }),
    setFollowMode: (value: boolean, lat?: number, lng?: number) =>
      post({ type: 'followMode', value, lat, lng }),
  }));

  useEffect(() => {
    if (!mapReady) return;
    post({ type: 'data', reports, readings });
  }, [mapReady, reports, readings]);

  useEffect(() => {
    if (!mapReady) return;
    post({ type: 'toggleAmbient', value: showAmbient, readings });
  }, [mapReady, showAmbient]);

  useEffect(() => {
    if (!mapReady) return;
    post({ type: 'toggleReports', value: showReports, reports });
  }, [mapReady, showReports]);

  useEffect(() => {
    if (!mapReady) return;
    const primaryCoords = primaryRoute ? routeCoords(primaryRoute.path) : null;
    const altCoords = alternateRoute ? routeCoords(alternateRoute.path) : null;
    post({ type: 'route', route: primaryCoords ? { primaryCoords, altCoords } : null });
  }, [mapReady, primaryRoute, alternateRoute]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'ready') {
        setMapReady(true);
      } else if (msg.type === 'selectReport') {
        onSelectReport(msg.id);
      }
    } catch {
      // ignore malformed bridge messages
    }
  };

  return (
    <WebView
      ref={webviewRef}
      source={{ html }}
      style={styles.webview}
      onMessage={handleMessage}
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={['*']}
    />
  );
});

export default MapWebView;

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    backgroundColor: '#020617',
  },
});
