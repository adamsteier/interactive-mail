interface BoundingBox {
  southwest: { lat: number; lng: number };
  northeast: { lat: number; lng: number };
}

interface GridCell {
  center: { lat: number; lng: number };
  bounds: BoundingBox;
  zoom: number;
}

export function calculateSearchGrid(
  boundingBox: BoundingBox,
  totalBusinesses: number,
  maxPerCell: number = 50
): GridCell[] {
  // Calculate how many cells we need
  const totalCells = Math.ceil(totalBusinesses / maxPerCell);
  
  // Calculate aspect ratio of the bounding box
  const latSpan = boundingBox.northeast.lat - boundingBox.southwest.lat;
  const lngSpan = boundingBox.northeast.lng - boundingBox.southwest.lng;
  const aspectRatio = Math.abs(lngSpan / latSpan);
  
  // Determine grid dimensions
  const initialCols = Math.round(Math.sqrt(totalCells * aspectRatio));
  let cols = initialCols;
  const rows = Math.ceil(totalCells / initialCols);
  
  // Ensure we have enough cells
  while (rows * cols < totalCells) {
    cols++;
  }
  
  const cells: GridCell[] = [];
  
  // Calculate cell dimensions
  const cellLatSpan = latSpan / rows;
  const cellLngSpan = lngSpan / cols;
  
  // Create grid cells
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cellSouthLat = boundingBox.southwest.lat + (row * cellLatSpan);
      const cellWestLng = boundingBox.southwest.lng + (col * cellLngSpan);
      
      const cell: GridCell = {
        bounds: {
          southwest: {
            lat: cellSouthLat,
            lng: cellWestLng
          },
          northeast: {
            lat: cellSouthLat + cellLatSpan,
            lng: cellWestLng + cellLngSpan
          }
        },
        center: {
          lat: cellSouthLat + (cellLatSpan / 2),
          lng: cellWestLng + (cellLngSpan / 2)
        },
        // Calculate zoom based on cell size
        zoom: calculateZoomLevel(cellLatSpan, cellLngSpan)
      };
      
      cells.push(cell);
    }
  }
  
  return cells;
}

function calculateZoomLevel(latSpan: number, lngSpan: number): number {
  // Approximate zoom level calculation
  // These values are tuned for typical city-level searches
  const maxSpan = Math.max(Math.abs(latSpan), Math.abs(lngSpan));
  if (maxSpan > 0.5) return 10;
  if (maxSpan > 0.2) return 11;
  if (maxSpan > 0.1) return 12;
  if (maxSpan > 0.05) return 13;
  if (maxSpan > 0.02) return 14;
  return 15;
} 