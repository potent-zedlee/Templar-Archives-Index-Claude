import { describe, it, expect } from 'vitest'
import { searchKeys, type SearchFilter } from '../queries/search-queries'
import { archiveKeys } from '../queries/archive-queries'

describe('Query Keys', () => {
  describe('searchKeys', () => {
    describe('normalizeFilter via searchKeys.hands()', () => {
      it('should return empty string key for undefined filter', () => {
        const key1 = searchKeys.hands()
        const key2 = searchKeys.hands(undefined)
        expect(key1).toEqual(key2)
        expect(key1[2]).toBe('')
      })

      it('should return empty string key for empty filter', () => {
        const key = searchKeys.hands({})
        expect(key[2]).toBe('{}')
      })

      it('should normalize filter with single property', () => {
        const key = searchKeys.hands({ limit: 10 })
        expect(key[2]).toBe('{"limit":10}')
      })

      it('should normalize filter with multiple properties in consistent order', () => {
        const filter1: SearchFilter = { limit: 10, offset: 0, streamId: 'abc' }
        const filter2: SearchFilter = { streamId: 'abc', limit: 10, offset: 0 }

        const key1 = searchKeys.hands(filter1)
        const key2 = searchKeys.hands(filter2)

        // Keys should be identical regardless of property order
        expect(key1).toEqual(key2)
      })

      it('should exclude undefined values from filter', () => {
        const filter: SearchFilter = {
          limit: 10,
          offset: undefined,
          streamId: 'abc',
          playerId: undefined
        }
        const key = searchKeys.hands(filter)

        // Should only include defined values
        expect(key[2]).toBe('{"limit":10,"streamId":"abc"}')
      })

      it('should handle boolean values', () => {
        const filter: SearchFilter = { favoriteOnly: true }
        const key = searchKeys.hands(filter)
        expect(key[2]).toBe('{"favoriteOnly":true}')
      })

      it('should produce consistent keys for cache hits', () => {
        // Same logical filter created at different times should produce same key
        const filter1 = { limit: 20, playerId: 'player-123' }
        const filter2 = { playerId: 'player-123', limit: 20 }

        expect(searchKeys.hands(filter1)).toEqual(searchKeys.hands(filter2))
      })
    })

    describe('searchKeys structure', () => {
      it('should have correct base key', () => {
        expect(searchKeys.all).toEqual(['search'])
      })

      it('should build tournaments key correctly', () => {
        expect(searchKeys.tournaments()).toEqual(['search', 'tournaments'])
      })

      it('should build players key correctly', () => {
        expect(searchKeys.players()).toEqual(['search', 'players'])
      })

      it('should build hands key with filter', () => {
        const key = searchKeys.hands({ limit: 5 })
        expect(key[0]).toBe('search')
        expect(key[1]).toBe('hands')
        expect(typeof key[2]).toBe('string')
      })
    })
  })

  describe('archiveKeys', () => {
    describe('archiveKeys structure', () => {
      it('should have correct base key', () => {
        expect(archiveKeys.all).toEqual(['archive'])
      })

      it('should build tournaments key correctly', () => {
        const key = archiveKeys.tournaments()
        expect(key[0]).toBe('archive')
        expect(key[1]).toBe('tournaments')
      })

      it('should build tournaments key with gameType filter', () => {
        const tournamentKey = archiveKeys.tournaments('tournament')
        const cashGameKey = archiveKeys.tournaments('cash-game')

        expect(tournamentKey).not.toEqual(cashGameKey)
        expect(tournamentKey).toContain('tournament')
      })

      it('should build tournamentsShallow key correctly', () => {
        const key = archiveKeys.tournamentsShallow()
        expect(key).toContain('tournaments-shallow')
      })

      it('should build tournamentsShallow key with gameType', () => {
        const key1 = archiveKeys.tournamentsShallow('tournament')
        const key2 = archiveKeys.tournamentsShallow('cash-game')

        expect(key1).not.toEqual(key2)
      })

      it('should build events key with tournamentId', () => {
        const key = archiveKeys.events('tournament-123')
        expect(key).toContain('events')
        expect(key).toContain('tournament-123')
      })

      it('should build streams key with tournamentId and eventId', () => {
        const key = archiveKeys.streams('tournament-123', 'event-456')
        expect(key).toContain('streams')
        expect(key).toContain('tournament-123')
        expect(key).toContain('event-456')
      })

      it('should build hands key with streamId', () => {
        const key = archiveKeys.hands('stream-789')
        expect(key).toContain('hands')
        expect(key).toContain('stream-789')
      })
    })

    describe('archiveKeys uniqueness', () => {
      it('should produce unique keys for different resources', () => {
        const tournamentsKey = archiveKeys.tournaments()
        const eventsKey = archiveKeys.events('t-1')
        const streamsKey = archiveKeys.streams('t-1', 'e-1')
        const handsKey = archiveKeys.hands('s-1')

        const allKeys = [tournamentsKey, eventsKey, streamsKey, handsKey]
        const stringKeys = allKeys.map(k => JSON.stringify(k))
        const uniqueKeys = new Set(stringKeys)

        expect(uniqueKeys.size).toBe(allKeys.length)
      })

      it('should produce different keys for different IDs', () => {
        const events1 = archiveKeys.events('tournament-1')
        const events2 = archiveKeys.events('tournament-2')

        expect(events1).not.toEqual(events2)
      })
    })
  })
})
