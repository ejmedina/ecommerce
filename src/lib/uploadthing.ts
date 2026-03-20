import { createUploadthing, type FileRouter } from "uploadthing/server"

const f = createUploadthing()

export const uploadthingRouter = {
  // Product images uploader
  productImages: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 10,
    },
  }).onUploadComplete(({ file }) => {
    return { url: file.url }
  }),
} satisfies FileRouter

export type AppFileRouter = typeof uploadthingRouter
