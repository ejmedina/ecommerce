import { NextRequest, NextResponse } from "next/server"
import { uploadToBlob } from "@/lib/blob"
import { requireAuth } from "@/lib/admin-auth"
import sharp from "sharp"

export async function POST(req: NextRequest) {
  const authError = await requireAuth()
  if (authError) return authError

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const type = formData.get("type") as string | null // "logo", "favicon", etc.

    if (!file || !type) {
      return NextResponse.json(
        { error: "Archivo o tipo no proporcionado" },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no permitido" },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB original)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "El archivo original es demasiado grande (máx 10MB)" },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    let processedBuffer: any = buffer
    let finalType = file.type
    let ext = file.name.split(".").pop() || "png"

    // Process image with sharp (except SVG)
    if (file.type.startsWith("image/") && file.type !== "image/svg+xml") {
      try {
        const image = sharp(buffer)
        const metadata = await image.metadata()
        
        // Resize to max 1920px width
        if (metadata.width && metadata.width > 2000) {
          image.resize(2000, undefined, { withoutEnlargement: true, fit: "inside" })
        }
        
        // Convert to WebP for better compression
        processedBuffer = await image
          .webp({ quality: 80 })
          .toBuffer()
        
        finalType = "image/webp"
        ext = "webp"
      } catch (sharpError) {
        console.error("Sharp processing error, using original buffer:", sharpError)
        // Fallback to original buffer if processing fails
      }
    }

    // Generate filename with type and timestamp
    const filename = `${type}-${Date.now()}.${ext}`

    // Upload to Vercel Blob
    const result = await uploadToBlob(processedBuffer as any, filename, finalType)

    return NextResponse.json({
      url: result.url,
      pathname: result.pathname,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "Error al subir archivo" },
      { status: 500 }
    )
  }
}
