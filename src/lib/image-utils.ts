import sharp from "sharp"
import path from "path"
import fs from "fs"

export interface ImageSize {
  width: number
  height: number
  suffix: string
}

// Default favicon sizes
export const FAVICON_SIZES: ImageSize[] = [
  { width: 16, height: 16, suffix: "16x16" },
  { width: 32, height: 32, suffix: "32x32" },
  { width: 48, height: 48, suffix: "48x48" },
  { width: 64, height: 64, suffix: "64x64" },
  { width: 128, height: 128, suffix: "128x128" },
  { width: 192, height: 192, suffix: "192x192" },
  { width: 512, height: 512, suffix: "512x512" },
]

// Logo sizes
export const LOGO_SIZES: ImageSize[] = [
  { width: 100, height: 0, suffix: "100w" }, // 0 height = auto
  { width: 200, height: 0, suffix: "200w" },
  { width: 400, height: 0, suffix: "400w" },
  { width: 800, height: 0, suffix: "800w" },
]

export interface ProcessedImage {
  originalPath: string
  sizes: { path: string; width: number; height: number }[]
  originalWidth: number
  originalHeight: number
  format: string
}

/**
 * Process an uploaded image and create multiple sizes
 * Returns the path to the original and generated sizes
 */
export async function processImage(
  inputBuffer: Buffer,
  filename: string,
  outputDir: string,
  sizes: ImageSize[]
): Promise<ProcessedImage> {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // Get original image metadata
  const metadata = await sharp(inputBuffer).metadata()
  const originalWidth = metadata.width || 0
  const originalHeight = metadata.height || 0
  const format = metadata.format || "unknown"

  const ext = path.extname(filename)
  const baseName = path.basename(filename, ext)

  const processedSizes: { path: string; width: number; height: number }[] = []

  // Generate resized versions
  for (const size of sizes) {
    const outputFilename = `${baseName}-${size.suffix}${ext}`
    const outputPath = path.join(outputDir, outputFilename)

    let resizeOptions: sharp.ResizeOptions = {
      width: size.width,
      withoutEnlargement: true,
    }

    // If height is specified, use fit
    if (size.height > 0) {
      resizeOptions = {
        width: size.width,
        height: size.height,
        fit: "cover",
      }
    }

    await sharp(inputBuffer)
      .resize(resizeOptions)
      .toFile(outputPath)

    const outMeta = await sharp(outputPath).metadata()
    processedSizes.push({
      path: outputPath,
      width: outMeta.width || size.width,
      height: outMeta.height || size.height,
    })
  }

  // Also save the original
  const originalPath = path.join(outputDir, `${baseName}-original${ext}`)
  await sharp(inputBuffer).toFile(originalPath)

  return {
    originalPath,
    sizes: processedSizes,
    originalWidth,
    originalHeight,
    format,
  }
}

/**
 * Process favicon - creates multiple sizes from an image
 */
export async function processFavicon(
  inputBuffer: Buffer,
  outputDir: string
): Promise<{ paths: string[]; width: number; height: number }> {
  return processImage(inputBuffer, "favicon", outputDir, FAVICON_SIZES)
}

/**
 * Process logo - creates responsive sizes from an image
 */
export async function processLogo(
  inputBuffer: Buffer,
  outputDir: string
): Promise<ProcessedImage> {
  return processImage(inputBuffer, "logo", outputDir, LOGO_SIZES)
}

/**
 * Get image dimensions without saving
 */
export async function getImageDimensions(
  inputBuffer: Buffer
): Promise<{ width: number; height: number; format: string }> {
  const metadata = await sharp(inputBuffer).metadata()
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || "unknown",
  }
}
