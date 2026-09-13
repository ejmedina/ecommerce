import { beforeEach, describe, expect, it, vi } from "vitest"

const transactionClient = {
  cart: {
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  cartItem: {
    update: vi.fn(),
  },
}

const mockDb = {
  $transaction: vi.fn(),
  cart: {
    findUnique: vi.fn(),
  },
}

vi.mock("@/lib/db", () => ({ db: mockDb }))

const guestCart = {
  id: "guest-cart",
  items: [{
    id: "guest-item",
    productId: "product-1",
    variantId: null,
    selectionSignature: null,
    comboConfiguration: null,
    quantity: 2,
  }],
}

describe("mergeGuestCartIntoUserCart", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.$transaction.mockImplementation(async (operation) => operation(transactionClient))
  })

  it("adopts the browser cart when the account has no cart", async () => {
    const { mergeGuestCartIntoUserCart } = await import("./cart")
    transactionClient.cart.findUnique
      .mockResolvedValueOnce(guestCart)
      .mockResolvedValueOnce(null)

    const result = await mergeGuestCartIntoUserCart("user-1", "browser-session")

    expect(result).toEqual({ strategy: "adopted_guest_cart", itemCount: 1 })
    expect(transactionClient.cart.update).toHaveBeenCalledWith({
      where: { id: "guest-cart" },
      data: { userId: "user-1", sessionId: null },
    })
    expect(transactionClient.cart.delete).not.toHaveBeenCalled()
  })

  it("combines matching items and transfers distinct guest items", async () => {
    const { mergeGuestCartIntoUserCart } = await import("./cart")
    transactionClient.cart.findUnique
      .mockResolvedValueOnce({
        ...guestCart,
        items: [
          guestCart.items[0],
          {
            id: "guest-combo",
            productId: "combo-1",
            variantId: null,
            selectionSignature: "combo-selection",
            comboConfiguration: [{ componentId: "component-a" }],
            quantity: 1,
          },
        ],
      })
      .mockResolvedValueOnce({
        id: "user-cart",
        items: [{
          id: "user-item",
          productId: "product-1",
          variantId: null,
          selectionSignature: null,
          comboConfiguration: null,
          quantity: 3,
        }],
      })

    const result = await mergeGuestCartIntoUserCart("user-1", "browser-session")

    expect(result).toEqual({ strategy: "merged_into_user_cart", itemCount: 2 })
    expect(transactionClient.cartItem.update).toHaveBeenCalledWith({
      where: { id: "user-item" },
      data: { quantity: 5 },
    })
    expect(transactionClient.cartItem.update).toHaveBeenCalledWith({
      where: { id: "guest-combo" },
      data: { cartId: "user-cart" },
    })
    expect(transactionClient.cart.delete).toHaveBeenCalledWith({ where: { id: "guest-cart" } })
  })

  it("never deletes the browser cart when transferring an item fails", async () => {
    const { mergeGuestCartIntoUserCart } = await import("./cart")
    transactionClient.cart.findUnique
      .mockResolvedValueOnce(guestCart)
      .mockResolvedValueOnce({ id: "user-cart", items: [] })
    transactionClient.cartItem.update.mockRejectedValueOnce(new Error("database unavailable"))

    await expect(mergeGuestCartIntoUserCart("user-1", "browser-session"))
      .rejects.toThrow("database unavailable")

    expect(transactionClient.cart.delete).not.toHaveBeenCalled()
  })
})
