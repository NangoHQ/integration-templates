import { NangoSync } from "nango";
/// <reference types="vitest" />
import { describe, it, expect, beforeEach } from 'vitest';
import type { HubSpotContactNonUndefined } from '../types.js';

interface Contact {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    job_title: string | null;
    last_contacted: string | null;
    last_activity_date: string | null;
    lead_status: string | null;
    lifecycle_stage: string | null;
    salutation: string | null;
    mobile_phone_number: string | null;
    website_url: string | null;
    created_date: string;
    owner: string | null;
}

class MockNango {
    private savedContacts: Contact[] = [];

    async *paginate<T>(config: any): AsyncGenerator<T[]> {
        // Mock contact data
        const mockContact: HubSpotContactNonUndefined = {
            id: 'contact_123',
            createdAt: '2024-03-26T10:00:00Z',
            updatedAt: '2024-03-26T10:00:00Z',
            archived: false,
            properties: {
                firstname: 'John',
                lastname: 'Doe',
                email: 'john.doe@example.com',
                jobtitle: 'Software Engineer',
                notes_last_contacted: '2024-03-26T09:00:00Z',
                notes_last_updated: '2024-03-26T09:30:00Z',
                hs_lead_status: 'NEW',
                lifecyclestage: 'CUSTOMER',
                salutation: 'Mr.',
                mobilephone: '+1234567890',
                website: 'https://example.com',
                createdate: '2024-03-26T10:00:00Z',
                hubspot_owner_id: 'owner_123'
            }
        };

        // Verify pagination configuration
        expect(config.endpoint).toBe('/crm/v3/objects/contacts');
        expect(config.paginate).toEqual({
            type: 'cursor',
            cursor_path_in_response: 'paging.next.after',
            limit_name_in_request: 'limit',
            cursor_name_in_request: 'after',
            response_path: 'results',
            limit: 100
        });
        expect(config.retries).toBe(10);

        // First page with data
        yield [mockContact as unknown as T];
        // Second page empty to simulate end of pagination
        yield [];
    }

    async batchSave(records: any[], model: string): Promise<void> {
        if (model === 'Contact' && records.length > 0) {
            this.savedContacts = [...this.savedContacts, ...records];
        }
    }

    getSavedContacts(): Contact[] {
        return this.savedContacts;
    }
}

describe('HubSpot Contacts Pagination Tests', () => {
    let nango: MockNango;

    beforeEach(() => {
        nango = new MockNango();
    });

    it('should configure cursor-based pagination correctly', async () => {
        const fetchData = (await import('../syncs/contacts')).default;
        await fetchData(nango as unknown as NangoSync);

        const savedContacts = nango.getSavedContacts();
        expect(savedContacts).toHaveLength(1);

        const firstContact = savedContacts[0];
        expect(firstContact).toEqual({
            id: 'contact_123',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john.doe@example.com',
            job_title: 'Software Engineer',
            last_contacted: '2024-03-26T09:00:00Z',
            last_activity_date: '2024-03-26T09:30:00Z',
            lead_status: 'NEW',
            lifecycle_stage: 'CUSTOMER',
            salutation: 'Mr.',
            mobile_phone_number: '+1234567890',
            website_url: 'https://example.com',
            created_date: '2024-03-26T10:00:00Z',
            owner: 'owner_123'
        });
    });

    it('should handle empty pages correctly', async () => {
        const fetchData = (await import('../syncs/contacts')).default;
        await fetchData(nango as unknown as NangoSync);

        // Should only have contacts from first page
        const savedContacts = nango.getSavedContacts();
        expect(savedContacts).toHaveLength(1);
    });

    it('should handle pagination errors', async () => {
        nango.paginate = async function* () {
            throw new Error('Pagination failed');
            yield [];
        };

        const fetchData = (await import('../syncs/contacts')).default;
        await expect(fetchData(nango as unknown as NangoSync)).rejects.toThrow('Pagination failed');
    });
});
