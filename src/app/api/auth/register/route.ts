import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { db } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Todos los campos son requeridos" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { message: "El email ya está registrado" },
        { status: 400 }
      )
    }

    // Create user
    const passwordHash = await hash(password, 12)
    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "CUSTOMER",
      },
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
    })
  } catch (error) {
    console.error("Register error:", error)
    return NextResponse.json(
      { message: "Error al crear la cuenta" },
      { status: 500 }
    )
  }
}
