export const cityDashboards = [
  {
    id: 'gnr',
    name: 'Gandhinagar',
    title: 'Gandhinagar Municipal Atlas',
    subtitle: 'Live traffic, hydrology and administrative layers',
    loadingLabel: 'Gandhinagar',
    sourceLabel: 'Gandhinagar Municipal Corporation (GMC)',
    defaultVisibleOverlays: ['Administrative / Boundaries | City Boundary'],
    initialFocusOverlay: 'Administrative / Boundaries | City Boundary',
    demOverlay: {
      label: 'Terrain | Gandhinagar DEM',
      metadataUrl: '/DEM/Gandhinagar_dem.metadata.json',
      imageUrl: '/DEM/Gandhinagar_dem_overlay.png',
    },
  },
];

export function getCityById(cityId) {
  return cityDashboards.find((city) => city.id === cityId) ?? cityDashboards[0];
}
