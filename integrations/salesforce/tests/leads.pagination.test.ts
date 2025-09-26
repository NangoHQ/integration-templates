import { NangoSync } from "nango";
import { describe, it, expect, beforeEach } from 'vitest';
import type { Lead } from '../models.js';
import type { SalesforceLead } from '../types.js';

interface NamedEntity {
    attributes: {
        type: string;
        url: string;
    };
    Name: string;
}

class MockNango {
    private savedLeads: Lead[] = [];
    private currentEndpoint: string = '';
    private pageCount: number = 0;
    private logMessages: string[] = [];

    async *paginate<T>(config: any): AsyncGenerator<T[]> {
        this.currentEndpoint = config.endpoint;
        console.log('Paginating endpoint:', config.endpoint);

        // Verify pagination configuration
        expect(config.paginate.type).toBe('link');
        expect(config.paginate.response_path).toBe('records');
        expect(config.paginate.link_path_in_response_body).toBe('nextRecordsUrl');

        if (this.pageCount === 0) {
            // First page of leads
            const mockLead1: SalesforceLead = {
                attributes: {
                    type: 'Lead',
                    url: '/services/data/v60.0/sobjects/Lead/00Q1234567890ABC'
                },
                Id: '00Q1234567890ABC',
                FirstName: 'John',
                MiddleName: null,
                LastName: 'Doe',
                Company: 'Acme Corp',
                Email: 'john.doe@acme.com',
                Title: 'CEO',
                Salutation: 'Mr.',
                Website: 'www.acme.com',
                Industry: 'Technology',
                LastModifiedDate: '2024-03-25T10:00:00Z',
                OwnerId: '0051234567890DEF',
                Owner: {
                    attributes: {
                        type: 'User',
                        url: '/services/data/v60.0/sobjects/User/0051234567890DEF'
                    },
                    Name: 'Sales Rep'
                },
                Phone: '123-456-7890'
            };

            const mockLead2: SalesforceLead = {
                attributes: {
                    type: 'Lead',
                    url: '/services/data/v60.0/sobjects/Lead/00Q1234567890XYZ'
                },
                Id: '00Q1234567890XYZ',
                FirstName: 'Jane',
                MiddleName: null,
                LastName: 'Smith',
                Company: 'Tech Inc',
                Email: 'jane.smith@techinc.com',
                Title: 'CTO',
                Salutation: 'Ms.',
                Website: 'www.techinc.com',
                Industry: 'Software',
                LastModifiedDate: '2024-03-25T11:00:00Z',
                OwnerId: '0051234567890GHI',
                Owner: {
                    attributes: {
                        type: 'User',
                        url: '/services/data/v60.0/sobjects/User/0051234567890GHI'
                    },
                    Name: 'Account Manager'
                },
                Phone: '987-654-3210'
            };

            this.pageCount++;
            yield [mockLead1, mockLead2] as unknown as T[];
        }
        yield [];
    }

    async batchSave<T>(records: T[], model: string): Promise<void> {
        if (model === 'Lead' && records.length > 0) {
            console.log('Saving leads:', records);
            this.savedLeads = [...this.savedLeads, ...(records as Lead[])];
            console.log('Current saved leads:', this.savedLeads);
        }
    }

    async log(message: string): Promise<void> {
        console.log('Log message:', message);
        this.logMessages.push(message);
    }

    getSavedLeads(): Lead[] {
        return this.savedLeads;
    }

    getLogMessages(): string[] {
        return this.logMessages;
    }

    getCurrentEndpoint(): string {
        return this.currentEndpoint;
    }
    async deleteRecordsFromPreviousExecutions(model: string): Promise<void> {
        // Mock deletion logic if needed
    }
}

describe('Salesforce Leads Pagination Tests', () => {
    let nango: MockNango;

    beforeEach(() => {
        nango = new MockNango();
    });

    it('should handle link-based pagination and map fields correctly', async () => {
        const fetchData = (await import('../syncs/leads')).default;
        await fetchData.exec(nango as unknown as NangoSync);

        const savedLeads = nango.getSavedLeads();
        expect(savedLeads).toHaveLength(2);

        // Verify first lead
        const firstLead = savedLeads[0];
        expect(firstLead).toBeDefined();
        if (firstLead) {
            expect(firstLead.id).toBe('00Q1234567890ABC');
            expect(firstLead.first_name).toBe('John');
            expect(firstLead.last_name).toBe('Doe');
            expect(firstLead.company_name).toBe('Acme Corp');
            expect(firstLead.email).toBe('john.doe@acme.com');
            expect(firstLead.title).toBe('CEO');
            expect(firstLead.salutation).toBe('Mr.');
            expect(firstLead.website).toBe('www.acme.com');
            expect(firstLead.industry).toBe('Technology');
            expect(firstLead.owner_id).toBe('0051234567890DEF');
            expect(firstLead.owner_name).toBe('Sales Rep');
            expect(firstLead.phone).toBe('123-456-7890');
            expect(firstLead.last_modified_date).toBe('2024-03-25T10:00:00Z');
        }

        // Verify second lead
        const secondLead = savedLeads[1];
        expect(secondLead).toBeDefined();
        if (secondLead) {
            expect(secondLead.id).toBe('00Q1234567890XYZ');
            expect(secondLead.first_name).toBe('Jane');
            expect(secondLead.last_name).toBe('Smith');
            expect(secondLead.company_name).toBe('Tech Inc');
            expect(secondLead.email).toBe('jane.smith@techinc.com');
            expect(secondLead.title).toBe('CTO');
            expect(secondLead.salutation).toBe('Ms.');
            expect(secondLead.website).toBe('www.techinc.com');
            expect(secondLead.industry).toBe('Software');
            expect(secondLead.owner_id).toBe('0051234567890GHI');
            expect(secondLead.owner_name).toBe('Account Manager');
            expect(secondLead.phone).toBe('987-654-3210');
            expect(secondLead.last_modified_date).toBe('2024-03-25T11:00:00Z');
        }
    });

    it('should handle empty responses', async () => {
        nango.paginate = async function* <T>(config: any): AsyncGenerator<T[]> {
            // Return empty results for all endpoints
            yield [];
        };

        const fetchData = (await import('../syncs/leads')).default;
        await fetchData.exec(nango as unknown as NangoSync);

        const savedLeads = nango.getSavedLeads();
        expect(savedLeads).toHaveLength(0);
    });

    it('should handle pagination errors', async () => {
        nango.paginate = async function* () {
            throw new Error('Pagination failed');
            yield [];
        };

        const fetchData = (await import('../syncs/leads')).default;
        await expect(fetchData.exec(nango as unknown as NangoSync)).rejects.toThrow('Pagination failed');
    });
});
