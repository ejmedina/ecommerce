import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { getImageDimensions } from "@/lib/image-utils"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const type = formData.get("type") as string | null // "logo" or "favicon"

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

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "El archivo es demasiado grande (máx 5MB)" },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Get image dimensions
    const dimensions = await getImageDimensions(buffer)

    // Create upload directory
    const uploadDir = path.join(process.cwd(), "public", "uploads", "store")
    await mkdir(uploadDir, { recursive: true })

    // Generate filename
    const ext = file.name.split(".").pop() || "png"
    const filename = `${type}-${Date.now()}.${ext}`
    const filepath = path.join(uploadDir, filename)

    // Save file
    await writeFile(filepath, buffer)

    // Return the public URL
    const url = `/uploads/store/${filename}`

    return NextResponse.json({
      url,
      width: dimensions.width,
      height: dimensions.height,
      format: dimensions.format,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "Error al subir archivo" },
      { status: 500 }
    )
  }
}
