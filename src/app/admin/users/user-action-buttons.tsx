"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck, ShieldMinus, Ban, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { setUserBlockedState, toggleUserAdminRole } from "./actions"

interface UserActionButtonsProps {
  userId: string
  role: string
  isBlocked: boolean
  canChangeRole: boolean
  canBlock: boolean
}

export function UserActionButtons({
  userId,
  role,
  isBlocked,
  canChangeRole,
  canBlock,
}: UserActionButtonsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function changeRole() {
    const message = role === "ADMIN"
      ? "Este usuario dejará de tener acceso al panel de administración. ¿Continuar?"
      : "Este usuario podrá acceder al panel de administración. ¿Continuar?"

    if (!window.confirm(message)) return

    startTransition(async () => {
      await toggleUserAdminRole(userId)
      router.refresh()
    })
  }

  function changeBlockedState() {
    const message = isBlocked
      ? "Este usuario podrá volver a iniciar sesión. ¿Continuar?"
      : "Este usuario no podrá iniciar sesión y verá un mensaje de usuario bloqueado. ¿Continuar?"

    if (!window.confirm(message)) return

    startTransition(async () => {
      await setUserBlockedState(userId, !isBlocked)
      router.refresh()
    })
  }

  return (
    <>
      {canChangeRole ? (
        <Button type="button" variant="outline" size="sm" onClick={changeRole} disabled={isPending}>
          {role === "ADMIN" ? (
            <ShieldMinus className="h-4 w-4 mr-1.5" />
          ) : (
            <ShieldCheck className="h-4 w-4 mr-1.5" />
          )}
          {role === "ADMIN" ? "Usuario regular" : "Convertir en admin"}
        </Button>
      ) : null}

      {canBlock ? (
        <Button
          type="button"
          variant={isBlocked ? "outline" : "destructive"}
          size="sm"
          onClick={changeBlockedState}
          disabled={isPending}
        >
          {isBlocked ? <RotateCcw className="h-4 w-4 mr-1.5" /> : <Ban className="h-4 w-4 mr-1.5" />}
          {isBlocked ? "Desbloquear" : "Bloquear"}
        </Button>
      ) : null}
    </>
  )
}
