import {
  useJsApiLoader,
  Libraries,
} from "@react-google-maps/api";
import {
  createContext,
  useContext,
  ReactNode,
} from "react";

const libraries: Libraries = ["places"];

interface GoogleMapsContextType {
  isLoaded: boolean;
  loadError?: Error;
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  isLoaded: false,
  loadError: undefined,
});

export function GoogleMapsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  return (
    <GoogleMapsContext.Provider
      value={{
        isLoaded,
        loadError,
      }}
    >
      {children}
    </GoogleMapsContext.Provider>
  );
}

export function useGoogleMaps() {
  return useContext(GoogleMapsContext);
}