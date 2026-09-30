import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { CheckoutSteps } from "./checkout-steps"
import { createOrder } from "@/lib/actions/order-actions"

vi.mock("@/components/cart-context", () => ({ useCart: () => ({ refreshCart: vi.fn() }) }))
vi.mock("@/lib/actions/order-actions", () => ({ createOrder: vi.fn() }))

const props = {
  cart: {
    id: "cart-1",
    items: [{ id: "item-1", quantity: 1, product: { id: "product-1", name: "Pan", price: 100, images: [], stock: 10 } }],
  },
  settings: { freeShippingMin: 0, fixedShippingCost: 0, bankAccount: null, shippingConfig: null },
  pricingResult: { rawSubtotal: 100, discountAmount: 0, totalToPay: 100, discounts: [] },
}

function reachConfirmation() {
  fireEvent.click(screen.getByRole("button", { name: /Continuar/ }))
  fireEvent.click(screen.getByRole("button", { name: /Continuar/ }))
}

describe("checkout contact phone", () => {
  beforeEach(() => vi.clearAllMocks())

  it("blocks a signed-in customer without a phone at confirmation", async () => {
    vi.mocked(createOrder).mockResolvedValue({ error: "test" })
    render(<CheckoutSteps {...props} user={{ id: "user-1", email: "cliente@example.com", phone: null }} />)
    reachConfirmation()

    const confirm = screen.getByRole("button", { name: /Confirmar pedido -/ })
    expect(screen.getByLabelText("Teléfono de contacto *")).toBeInTheDocument()
    expect(confirm).toBeDisabled()

    fireEvent.change(screen.getByLabelText("Teléfono de contacto *"), { target: { value: "1122334455" } })
    expect(confirm).toBeEnabled()
    fireEvent.click(confirm)
    await waitFor(() => expect(createOrder).toHaveBeenCalled())
    expect(vi.mocked(createOrder).mock.calls[0][0].get("phone")).toBe("1122334455")
  })

  it("uses a valid phone already stored on the customer", () => {
    render(<CheckoutSteps {...props} user={{ id: "user-1", email: "cliente@example.com", phone: "1122334455" }} />)
    reachConfirmation()

    expect(screen.queryByLabelText("Teléfono de contacto *")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Confirmar pedido -/ })).toBeEnabled()
  })

  it("requests a phone from guests in the account step", () => {
    render(<CheckoutSteps {...props} />)
    expect(screen.getByLabelText("Teléfono *")).toBeRequired()
  })
})
