import { ProxyConfiguration, NangoSync } from "nango";
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosResponse } from 'axios';
import type { SalesforceContact } from '../types.js';

interface Contact {
    id: string;
    first_name: string | null;
    last_name: string;
    account_name: string | null;
    account_id: string | null;
    email: string | null;
    owner_id: string;
    owner_name: string;
    mobile: string | null;
    phone: string | null;
    salutation: string | null;
    title: string | null;
    last_modified_date: string;
}

let savedContacts: Contact[] = [];

class MockNango implements Partial<NangoSync> {
    lastSyncDate?: Date;
    variant = 'cloud';
    track_deletes = false;
    batchSize = 100;

    async get<T = any>(config: Omit<ProxyConfiguration, 'method'>): Promise<AxiosResponse<T>> {
        throw new Error('Method not implemented.');
    }

    async *paginate<T>(config: ProxyConfiguration): AsyncGenerator<T[], undefined, undefined> {
        const mockContact: SalesforceContact = {
            attributes: {
                type: 'Contact',
                url: '/services/data/v60.0/sobjects/Contact/123'
            },
            Id: 'contact123',
            FirstName: 'John',
            LastName: 'Doe',
            Email: 'john.doe@example.com',
            AccountId: 'acc123',
            OwnerId: 'owner123',
            Owner: {
                attributes: {
                    type: 'User',
                    url: '/services/data/v60.0/sobjects/User/owner123'
                },
                Name: 'Owner Name'
            },
            MobilePhone: '+1234567890',
            Phone: '+0987654321',
            Title: 'Software Engineer',
            Salutation: 'Mr.',
            LastModifiedDate: '2024-03-26T12:00:00Z',
            Account: {
                attributes: {
                    type: 'Account',
                    url: '/services/data/v60.0/sobjects/Account/acc123'
                },
                Name: 'Example Corp'
            },
            MiddleName: null
        };

        // First page with data
        if (config.endpoint === '/services/data/v60.0/query') {
            const response = {
                records: [mockContact],
                nextRecordsUrl: '/services/data/v60.0/query/01gD0000002HYp2IAG-2000'
            };
            yield response.records as T[];
        }
        // Second page (empty)
        else if (config.endpoint === '/services/data/v60.0/query/01gD0000002HYp2IAG-2000') {
            const response = {
                records: [],
                nextRecordsUrl: null
            };
            yield response.records as T[];
        }
    }

    async batchSave<T extends object>(results: T[], model: string): Promise<boolean | null> {
        console.log('batchSave called with:', JSON.stringify(results, null, 2));
        console.log('model:', model);
        if (results.length > 0) {
            savedContacts = [...savedContacts, ...(results as Contact[])];
        }
        console.log('savedContacts before assertions:', JSON.stringify(savedContacts, null, 2));
        return true;
    }
}

describe('Salesforce Contacts Pagination', () => {
    beforeEach(() => {
        savedContacts = [];
    });

    it('should configure link-based pagination correctly', async () => {
        const nango = new MockNango() as unknown as NangoSync;
        const fetchData = (await import('../syncs/contacts')).default;
        await fetchData.exec(nango);

        expect(savedContacts).toHaveLength(1);
        expect(savedContacts[0]).toEqual({
            id: 'contact123',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john.doe@example.com',
            account_id: 'acc123',
            account_name: 'Example Corp',
            owner_id: 'owner123',
            owner_name: 'Owner Name',
            mobile: '+1234567890',
            phone: '+0987654321',
            title: 'Software Engineer',
            salutation: 'Mr.',
            last_modified_date: '2024-03-26T12:00:00Z'
        });
    });

    it('should handle empty pages', async () => {
        const nango = new MockNango() as unknown as NangoSync;
        const fetchData = (await import('../syncs/contacts')).default;
        await fetchData.exec(nango);

        // After the first page with data, we get an empty page
        // The test should pass with only the contacts from the first page
        expect(savedContacts).toHaveLength(1);
    });

    it('should handle pagination errors', async () => {
        const nango = new MockNango() as unknown as NangoSync;
        nango.paginate = async function* <T>(): AsyncGenerator<T[], undefined, undefined> {
            throw new Error('Pagination error');
        };

        const fetchData = (await import('../syncs/contacts')).default;
        await expect(fetchData.exec(nango)).rejects.toThrow('Pagination error');
    });
});
