import { CHUNK_SIZE, type FloorRecord, type TileType } from '../types.js'
import { collectChunkTiles, writeChunk } from './chunks.js'

export function persistFloor(args: {
  dataRoot: string
  dungeonId: string
  floorIndex: number
  grid: TileType[][]
}): { record: FloorRecord; chunks: string[] } {
  const height = args.grid.length
  const width = args.grid[0]?.length ?? 0
  const chunks: string[] = []
  for (let cy = 0; cy * CHUNK_SIZE < height; cy++) {
    for (let cx = 0; cx * CHUNK_SIZE < width; cx++) {
      const tiles = collectChunkTiles(args.grid, cx, cy)
      chunks.push(
        writeChunk(
          {
            dataRoot: args.dataRoot,
            dungeonId: args.dungeonId,
            floorIndex: args.floorIndex,
            cx,
            cy
          },
          tiles
        )
      )
    }
  }
  return {
    record: {
      floorIndex: args.floorIndex,
      bounds: { minX: 0, minY: 0, maxX: width - 1, maxY: height - 1 },
      cellCount: width * height
    },
    chunks
  }
}
