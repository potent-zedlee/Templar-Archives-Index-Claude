import { describe, it, expect } from 'vitest'
import {
  naturalSearchSchema,
  importHandsSchema,
  tournamentSchema,
  createPostSchema,
  createCommentSchema,
  playerClaimSchema,
  handEditRequestSchema,
  contentReportSchema,
  createBookmarkSchema,
  updateProfileSchema,
  validateInput,
  formatValidationErrors,
} from '../validation/api-schemas'

describe('Validation Utilities', () => {
  describe('naturalSearchSchema', () => {
    it('should validate correct search queries', () => {
      const valid = {
        query: 'pocket aces preflop',
      }
      const result = naturalSearchSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should reject empty queries', () => {
      const invalid = { query: '   ' }
      const result = naturalSearchSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should reject too long queries', () => {
      const invalid = { query: 'a'.repeat(201) }
      const result = naturalSearchSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should reject queries with special characters', () => {
      const invalid = { query: 'DROP TABLE users; --' }
      const result = naturalSearchSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  describe('importHandsSchema', () => {
    it('should validate correct hand import data', () => {
      const valid = {
        streamId: '123e4567-e89b-42d3-a456-426614174000',
        hands: [
          {
            number: '1',
            description: 'Preflop raise with AK',
            timestamp: '00:15:30',
            summary: 'Hero wins with top pair',
            potSize: 1000,
            boardCards: ['As', 'Kh', '7c', '3d', 'Qh'],
          },
        ],
      }
      const result = importHandsSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should reject invalid UUID', () => {
      const invalid = {
        streamId: 'not-a-uuid',
        hands: [
          {
            number: '1',
            description: 'Test',
            timestamp: '00:15:30',
          },
        ],
      }
      const result = importHandsSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should reject too many hands', () => {
      const invalid = {
        streamId: '123e4567-e89b-42d3-a456-426614174000',
        hands: Array(101).fill({
          number: '1',
          description: 'Test',
          timestamp: '00:15:30',
        }),
      }
      const result = importHandsSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  describe('tournamentSchema', () => {
    it('should validate correct tournament data', () => {
      const valid = {
        name: 'WSOP 2024 Main Event',
        category: 'WSOP',
        location: 'Las Vegas',
        startDate: '2024-07-01',
        endDate: '2024-07-15',
      }
      const result = tournamentSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should reject invalid category', () => {
      const invalid = {
        name: 'Test Tournament',
        category: 'InvalidCategory',
        location: 'Test',
        startDate: '2024-07-01',
        endDate: '2024-07-15',
      }
      const result = tournamentSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should reject invalid date format', () => {
      const invalid = {
        name: 'Test Tournament',
        category: 'WSOP',
        location: 'Test',
        startDate: '07/01/2024',
        endDate: '2024-07-15',
      }
      const result = tournamentSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  describe('createPostSchema', () => {
    it('should validate correct post data', () => {
      const valid = {
        title: 'Amazing Hand Analysis',
        content: 'This is a detailed analysis of a poker hand...',
        category: 'hand-analysis',
        handId: '123e4567-e89b-42d3-a456-426614174000',
      }
      const result = createPostSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should reject empty title', () => {
      const invalid = {
        title: '   ',
        content: 'Content',
        category: 'hand-analysis',
      }
      const result = createPostSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should reject too long content', () => {
      const invalid = {
        title: 'Title',
        content: 'a'.repeat(10001),
        category: 'analysis',
      }
      const result = createPostSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  describe('createCommentSchema', () => {
    it('should validate correct comment data', () => {
      const valid = {
        postId: '123e4567-e89b-42d3-a456-426614174000',
        content: 'Great analysis! I agree with your decision.',
        parentCommentId: '550e8400-e29b-41d4-a716-446655440000',
      }
      const result = createCommentSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should reject empty comment', () => {
      const invalid = {
        postId: '123e4567-e89b-42d3-a456-426614174000',
        content: '   ',
      }
      const result = createCommentSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  describe('playerClaimSchema', () => {
    it('should validate correct claim data', () => {
      const valid = {
        playerId: '123e4567-e89b-42d3-a456-426614174000',
        proofType: 'social_media',
        proofUrl: 'https://twitter.com/player/status/123',
        proofText: 'Additional verification details',
      }
      const result = playerClaimSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should reject invalid proofType', () => {
      const invalid = {
        playerId: '123e4567-e89b-42d3-a456-426614174000',
        proofType: 'invalid_type',
        proofUrl: 'https://twitter.com/player',
      }
      const result = playerClaimSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  describe('handEditRequestSchema', () => {
    it('should validate correct edit request', () => {
      const valid = {
        handId: '123e4567-e89b-42d3-a456-426614174000',
        editType: 'board',
        oldValue: 'As Kh 7c 3d Qh',
        newValue: 'As Kh 7c 3d 9h',
        reason: 'The river card was misidentified',
      }
      const result = handEditRequestSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should reject empty reason', () => {
      const invalid = {
        handId: '123e4567-e89b-42d3-a456-426614174000',
        editType: 'board',
        oldValue: 'As Kh 7c',
        newValue: 'As Kh 8c',
        reason: '   ',
      }
      const result = handEditRequestSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  describe('contentReportSchema', () => {
    it('should validate correct report data', () => {
      const valid = {
        targetType: 'post',
        targetId: '123e4567-e89b-42d3-a456-426614174000',
        reason: 'spam',
        details: 'This post is promotional spam',
      }
      const result = contentReportSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should reject invalid targetType', () => {
      const invalid = {
        targetType: 'user',
        targetId: '123e4567-e89b-42d3-a456-426614174000',
        reason: 'spam',
      }
      const result = contentReportSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  describe('createBookmarkSchema', () => {
    it('should validate correct bookmark data', () => {
      const valid = {
        handId: '123e4567-e89b-42d3-a456-426614174000',
        folderName: 'Amazing Bluffs',
        notes: 'This hand shows excellent bluffing technique',
      }
      const result = createBookmarkSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should allow bookmark without folder or notes', () => {
      const valid = {
        handId: '123e4567-e89b-42d3-a456-426614174000',
      }
      const result = createBookmarkSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })
  })

  describe('updateProfileSchema', () => {
    it('should validate correct profile data', () => {
      const valid = {
        nickname: 'PokerPro123',
        bio: 'Professional poker player',
        avatarUrl: 'https://example.com/avatar.jpg',
        socialLinks: {
          twitter: 'https://twitter.com/pokerpro',
          twitch: 'https://twitch.tv/pokerpro',
          youtube: 'https://youtube.com/pokerpro',
        },
        visibility: 'public',
      }
      const result = updateProfileSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should reject invalid visibility', () => {
      const invalid = {
        nickname: 'PokerPro',
        visibility: 'secret',
      }
      const result = updateProfileSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })

  describe('validateInput', () => {
    it('should return success for valid data', () => {
      const result = validateInput(naturalSearchSchema, { query: 'test' })
      expect(result.success).toBe(true)
      expect(result.data).toEqual({ query: 'test' })
      expect(result.errors).toBeUndefined()
    })

    it('should return errors for invalid data', () => {
      const result = validateInput(naturalSearchSchema, { query: '' })
      expect(result.success).toBe(false)
      expect(result.data).toBeUndefined()
      expect(result.errors).toBeDefined()
    })
  })

  describe('formatValidationErrors', () => {
    it('should format validation errors correctly', () => {
      const result = naturalSearchSchema.safeParse({ query: '' })
      if (!result.success) {
        const formatted = formatValidationErrors(result.error)
        expect(formatted.length).toBeGreaterThan(0)
        expect(formatted[0]).toContain('query')
      }
    })
  })
})
