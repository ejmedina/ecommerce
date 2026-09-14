import { describe, expect, it, vi } from "vitest"
import { withDatabaseRetry } from "./db"

describe("withDatabaseRetry", () => {
  it("retries a closed PostgreSQL connection without disconnecting the shared client", async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error("Error in PostgreSQL connection: Error { kind: Closed, cause: None }"))
      .mockResolvedValueOnce("recovered")

    await expect(withDatabaseRetry(operation, "Cart.findUnique", [0])).resolves.toBe("recovered")
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it("does not retry non-connectivity errors", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("Invalid query"))

    await expect(withDatabaseRetry(operation, "Cart.findUnique", [0])).rejects.toThrow("Invalid query")
    expect(operation).toHaveBeenCalledTimes(1)
  })
})
