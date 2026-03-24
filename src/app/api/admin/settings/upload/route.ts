import { NextRequest, NextResponse } from "next/server"
import { uploadToBlob } from "@/lib/blob"
import { requireAuth } from "@/lib/admin-auth"

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

    // Generate filename with type and timestamp
    const ext = file.name.split(".").pop() || "png"
    const filename = `${type}-${Date.now()}.${ext}`

    // Upload to Vercel Blob
    const result = await uploadToBlob(buffer, filename, file.type)

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
