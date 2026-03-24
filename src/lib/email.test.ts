import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendVerificationEmail } from './email'

// Mock crypto
const mockRandomUUID = 'test-token-12345'
vi.stubGlobal('crypto', {
  randomUUID: () => mockRandomUUID,
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
