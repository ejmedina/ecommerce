import { put, del, list } from "@vercel/blob"

export interface UploadResult {
  url: string
  pathname: string
}

export async function uploadToBlob(
  file: Buffer,
  filename: string,
  contentType: string
): Promise<UploadResult> {
  const blob = await put(filename, file, {
    contentType,
    access: "public",
  })

  return {
    url: blob.url,
    pathname: blob.pathname,
  }
}

export async function deleteFromBlob(pathname: string): Promise<void> {
  await del(pathname)
}

export async function listBlobs(prefix?: string) {
  const blobs = await list({
    prefix: prefix || "",
  })
  return blobs.blobs
}
