import { describe, it, expect } from 'vitest';
import { eventSchema } from '../schema.zod';
import type { z } from 'zod';

type Event = z.infer<typeof eventSchema>;

interface PaginationResponse<T> {
    collection: T[];
    pagination: {
        next_page_token?: string;
    };
}

interface NangoResponse<T> {
    data: PaginationResponse<T>;
}

class MockNango {
    private savedEvents: Event[] = [];
    private deletedEvents: string[] = [];

    async getConnection(): Promise<{ connection_config: { owner: string } }> {
        return {
            connection_config: {
                owner: 'test_user_123'
            }
        };
    }

    async *paginate<T>(config: any): AsyncGenerator<T[]> {
        // Mock pagination for scheduled events
        const mockEvent: Event = {
            id: 'evt_123',
            uri: 'https://api.calendly.com/scheduled_events/evt_123',
            name: 'Test Meeting',
            meeting_notes_plain: 'Test notes',
            meeting_notes_html: '<p>Test notes</p>',
            status: 'active',
            start_time: '2024-03-27T10:00:00Z',
            end_time: '2024-03-27T11:00:00Z',
            event_type: 'https://api.calendly.com/event_types/evt_type_123',
            location: {
                type: 'zoom',
                join_url: 'https://zoom.us/j/123',
                status: 'active',
                additional_info: ''
            },
            invitees_counter: {
                total: 1,
                active: 1,
                limit: 10
            },
            created_at: '2024-03-26T10:00:00Z',
            updated_at: '2024-03-26T10:00:00Z',
            event_memberships: [
                {
                    user: 'user_123',
                    user_email: 'test@example.com',
                    user_name: 'Test User'
                }
            ],
            event_guests: [
                {
                    email: 'guest@example.com',
                    created_at: '2024-03-26T10:00:00Z',
                    updated_at: '2024-03-26T10:00:00Z'
                }
            ],
            calendar_event: {
                kind: 'google',
                external_id: 'google_123'
            }
        };

        // First page with data
        yield [mockEvent as unknown as T];
        // Second page empty to simulate end of pagination
        yield [];
    }

    async batchSave(records: any[], model: string): Promise<void> {
        if (model === 'Event' && records.length > 0) {
            this.savedEvents = [...this.savedEvents, ...records];
        }
    }

    async batchDelete(ids: string[], model: string): Promise<void> {
        if (model === 'Event' && ids.length > 0) {
            this.deletedEvents = [...this.deletedEvents, ...ids];
        }
    }

    getSavedEvents(): Event[] {
        return this.savedEvents;
    }

    getDeletedEvents(): string[] {
        return this.deletedEvents;
    }
}

describe('Calendly Events Pagination Tests', () => {
    it('should configure token-based pagination correctly', async () => {
        const nango = new MockNango();
        const events = await import('../syncs/events');

        await events.default.exec(nango as any);

        const savedEvents = nango.getSavedEvents();
        expect(savedEvents).toHaveLength(1);
        const firstEvent = savedEvents[0];
        expect(firstEvent?.id).toBe('evt_123');
        expect(firstEvent?.status).toBe('active');
    });

    it('should handle empty pages correctly', async () => {
        const nango = new MockNango();
        const events = await import('../syncs/events');

        await events.default.exec(nango as any);

        // Should only have events from first page
        const savedEvents = nango.getSavedEvents();
        expect(savedEvents).toHaveLength(1);
    });

    it('should handle pagination errors', async () => {
        const nango = new MockNango();
        // Override paginate to simulate an error
        nango.paginate = async function* () {
            throw new Error('Pagination failed');
            yield [];
        };

        const events = await import('../syncs/events');

        await expect(events.default.exec(nango as any)).rejects.toThrow('Pagination failed');
    });
});
