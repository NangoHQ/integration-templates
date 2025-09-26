import { NangoSync } from "nango";
/// <reference types="vitest" />
import { describe, it, expect, beforeEach } from 'vitest';

interface OutlookCalendarEvent {
    id: string;
    subject: string;
    bodyPreview: string;
    importance: string;
    sensitivity: string;
    body: {
        contentType: 'html' | 'text';
        content: string;
    };
    start: {
        dateTime: string;
        timeZone: string;
    };
    end: {
        dateTime: string;
        timeZone: string;
    };
    location: {
        displayName: string;
    };
    isAllDay: boolean;
    isCancelled: boolean;
    isOrganizer: boolean;
    recurrence: any;
    responseRequested: boolean;
    responseStatus: {
        response: string;
        time: string;
    };
    attendees: Array<{
        emailAddress: {
            name: string;
            address: string;
        };
        status: {
            response: string;
            time: string;
        };
        type: string;
    }>;
    organizer: {
        emailAddress: {
            name: string;
            address: string;
        };
    };
    webLink: string;
    onlineMeeting: {
        joinUrl: string;
    } | null;
    onlineMeetingProvider: string | null;
    '@odata.etag': string;
    '@odata.id': string;
}

class MockNango {
    private savedEvents: OutlookCalendarEvent[] = [];
    private currentEndpoint: string = '';
    private pageCount: number = 0;

    async getMetadata<T>(): Promise<T | undefined> {
        return undefined; // Return undefined to use default backfill period
    }

    async log(message: string): Promise<void> {
        // Mock logging - no action needed for tests
    }

    async *paginate<T>(config: any): AsyncGenerator<T[]> {
        this.currentEndpoint = config.endpoint;

        // Verify pagination configuration
        expect(config.endpoint).toBe('/v1.0/me/events');
        expect(config.params.$select).toContain('id');
        expect(config.params.$select).toContain('subject');
        expect(config.params.$filter).toMatch(/start\/dateTime ge '\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z'/);
        expect(config.params.$orderby).toBe('start/dateTime asc');
        expect(config.paginate).toEqual({
            type: 'link',
            response_path: 'value',
            link_path_in_response_body: '@odata.nextLink',
            limit: 50,
            limit_name_in_request: '$top'
        });
        expect(config.retries).toBe(10);

        // Mock event data for first page
        const mockEvent1: OutlookCalendarEvent = {
            id: 'event_1',
            subject: 'Test Event 1',
            bodyPreview: 'Event description',
            importance: 'normal',
            sensitivity: 'normal',
            body: {
                contentType: 'html',
                content: ''
            },
            start: {
                dateTime: '2024-03-26T10:00:00.000Z',
                timeZone: 'UTC'
            },
            end: {
                dateTime: '2024-03-26T11:00:00.000Z',
                timeZone: 'UTC'
            },
            location: {
                displayName: 'Online'
            },
            isAllDay: false,
            isCancelled: false,
            isOrganizer: true,
            recurrence: null,
            responseRequested: true,
            responseStatus: {
                response: 'organizer',
                time: '2024-03-25T10:00:00.000Z'
            },
            attendees: [
                {
                    emailAddress: {
                        name: 'John Doe',
                        address: 'john@example.com'
                    },
                    status: {
                        response: 'accepted',
                        time: '2024-03-25T10:30:00.000Z'
                    },
                    type: 'required'
                }
            ],
            organizer: {
                emailAddress: {
                    name: 'Test User',
                    address: 'test@example.com'
                }
            },
            webLink: 'https://outlook.office.com/calendar/event/123',
            onlineMeeting: {
                joinUrl: 'https://teams.microsoft.com/meet/123'
            },
            onlineMeetingProvider: 'teamsForBusiness',
            '@odata.etag': 'W/"etag123"',
            '@odata.id': 'events/123'
        };

        // Mock event data for second page
        const mockEvent2: OutlookCalendarEvent = {
            ...mockEvent1,
            id: 'event_2',
            subject: 'Test Event 2',
            start: {
                dateTime: '2024-03-26T14:00:00.000Z',
                timeZone: 'UTC'
            },
            end: {
                dateTime: '2024-03-26T15:00:00.000Z',
                timeZone: 'UTC'
            },
            '@odata.etag': 'W/"etag456"',
            '@odata.id': 'events/456'
        };

        // First page
        yield [mockEvent1 as unknown as T];
        this.pageCount++;

        // Second page
        yield [mockEvent2 as unknown as T];
        this.pageCount++;

        // Third page (empty)
        yield [];
    }

    async batchSave<T>(records: T[], model: string): Promise<void> {
        if (model === 'OutlookCalendarEvent' && records.length > 0) {
            const processedRecords = records.map((record: any) => {
                // Remove OData metadata properties as done in the actual implementation
                const { '@odata.etag': _, '@odata.id': __, ...rest } = record;
                return rest;
            });
            this.savedEvents = [...this.savedEvents, ...(processedRecords as OutlookCalendarEvent[])];
        }
    }

    getSavedEvents(): OutlookCalendarEvent[] {
        return this.savedEvents;
    }

    getCurrentEndpoint(): string {
        return this.currentEndpoint;
    }

    getPageCount(): number {
        return this.pageCount;
    }
    async deleteRecordsFromPreviousExecutions(model: string): Promise<void> {
        // Mock deletion logic if needed
    }
}

describe('Outlook Events Pagination Tests', () => {
    let nango: MockNango;

    beforeEach(() => {
        nango = new MockNango();
    });

    it('should handle link-based pagination correctly', async () => {
        const fetchData = (await import('../syncs/events')).default;
        await fetchData.exec(nango as unknown as NangoSync);

        const savedEvents = nango.getSavedEvents();
        expect(savedEvents).toHaveLength(2); // Two pages of events

        // Verify first event
        const firstEvent = savedEvents[0];
        expect(firstEvent).toBeDefined();
        if (firstEvent) {
            expect(firstEvent.id).toBe('event_1');
            expect(firstEvent.subject).toBe('Test Event 1');
            expect(firstEvent.start.dateTime).toBe('2024-03-26T10:00:00.000Z');
            expect(firstEvent.attendees).toHaveLength(1);
            expect(firstEvent.attendees[0]?.emailAddress.name).toBe('John Doe');

            // Verify OData metadata is removed
            expect(firstEvent['@odata.etag']).toBeUndefined();
            expect(firstEvent['@odata.id']).toBeUndefined();
        }
    });

    it('should handle empty responses', async () => {
        nango.paginate = async function* <T>(config: any): AsyncGenerator<T[]> {
            // Return empty results
            yield [];
        };

        const fetchData = (await import('../syncs/events')).default;
        await fetchData.exec(nango as unknown as NangoSync);

        const savedEvents = nango.getSavedEvents();
        expect(savedEvents).toHaveLength(0);
    });

    it('should handle pagination errors', async () => {
        nango.paginate = async function* () {
            throw new Error('Pagination failed');
            yield [];
        };

        const fetchData = (await import('../syncs/events')).default;
        await expect(fetchData.exec(nango as unknown as NangoSync)).rejects.toThrow('Pagination failed');
    });
});
