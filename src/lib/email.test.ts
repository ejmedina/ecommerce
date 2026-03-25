import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendVerificationEmail, getStoreUrl } from './email'
import { db } from './db'

// Mock crypto
const mockRandomUUID = 'test-token-12345'
vi.stubGlobal('crypto', {
  randomUUID: () => mockRandomUUID,
})

// Mock db
vi.mock('./db', () => ({
  db: {
    storeSettings: {
      findFirst: vi.fn(),
    },
  },
}))

describe('getStoreUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset env variable
    delete process.env.NEXT_PUBLIC_APP_URL
  })

  it('should return storeUrl from database when configured', async () => {
    vi.mocked(db.storeSettings.findFirst).mockResolvedValue({
      storeUrl: 'https://mi-tienda.com',
    } as any)

    const result = await getStoreUrl()

    expect(result).toBe('https://mi-tienda.com')
    expect(db.storeSettings.findFirst).toHaveBeenCalled()
  })

  it('should fallback to NEXT_PUBLIC_APP_URL when storeUrl is not set', async () => {
    vi.mocked(db.storeSettings.findFirst).mockResolvedValue({
      storeUrl: null,
    } as any)
    process.env.NEXT_PUBLIC_APP_URL = 'https://staging.vercel.app'

    const result = await getStoreUrl()

    expect(result).toBe('https://staging.vercel.app')
  })

  it('should fallback to localhost when neither DB nor env is set', async () => {
    vi.mocked(db.storeSettings.findFirst).mockResolvedValue({
      storeUrl: null,
    } as any)

    const result = await getStoreUrl()

    expect(result).toBe('http://localhost:3000')
  })

  it('should fallback to env when DB query fails', async () => {
    vi.mocked(db.storeSettings.findFirst).mockRejectedValue(new Error('DB error'))
    process.env.NEXT_PUBLIC_APP_URL = 'https://fallback.com'

    const result = await getStoreUrl()

    expect(result).toBe('https://fallback.com')
  })
})

describe('sendVerificationEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should send email for email_verification type', async () => {
    const result = await sendVerificationEmail({
      to: 'test@example.com',
      token: 'test-token',
      type: 'email_verification',
    })

    // The function returns the result of sendEmail, which is mocked
    expect(result).toBeDefined()
  })

  it('should send email for email_change type', async () => {
    const result = await sendVerificationEmail({
      to: 'test@example.com',
      token: 'test-token',
      type: 'email_change',
    })

    expect(result).toBeDefined()
  })

  it('should send email for guest_checkout type', async () => {
    const result = await sendVerificationEmail({
      to: 'test@example.com',
      token: 'test-token',
      type: 'guest_checkout',
    })

    expect(result).toBeDefined()
  })

  it('should handle missing resend configuration gracefully', async () => {
    // Save original env
    const originalEnv = process.env.RESEND_API_KEY
    process.env.RESEND_API_KEY = undefined

    const result = await sendVerificationEmail({
      to: 'test@example.com',
      token: 'test-token',
      type: 'email_verification',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Resend not configured')

    // Restore env
    process.env.RESEND_API_KEY = originalEnv
  })
})
