import { createRouteHandler } from "uploadthing/server/next/server"
import { uploadthingRouter } from "@/lib/uploadthing"

export const { GET, POST } = createRouteHandler({
  router: uploadthingRouter,
})
