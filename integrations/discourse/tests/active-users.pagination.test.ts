import { ProxyConfiguration, NangoSync } from "nango";
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosResponse } from 'axios';
import type { DiscourseUser } from '../types.js';

interface User {
    id: number;
    username: string;
    name: string;
    admin: boolean;
}

let savedUsers: User[] = [];

class MockNango implements Partial<NangoSync> {
    lastSyncDate?: Date;
    variant = 'cloud';
    track_deletes = false;
    batchSize = 100;

    async get<T = any>(config: Omit<ProxyConfiguration, 'method'>): Promise<AxiosResponse<T>> {
        throw new Error('Method not implemented.');
    }

    async *paginate<T>(config: ProxyConfiguration): AsyncGenerator<T[], undefined, undefined> {
        const mockUser: DiscourseUser = {
            id: 123,
            username: 'johndoe',
            name: 'John Doe',
            avatar_template: 'https://example.com/avatar.png',
            email: 'john@example.com',
            secondary_emails: [],
            active: true,
            admin: true,
            moderator: false,
            last_seen_at: '2024-03-26T12:00:00Z',
            last_emailed_at: '2024-03-26T11:00:00Z',
            created_at: '2024-01-01T00:00:00Z',
            last_seen_age: 3600,
            last_emailed_age: 7200,
            created_at_age: 86400,
            trust_level: 3,
            manual_locked_trust_level: 'none',
            title: 'Senior Member',
            time_read: 50000,
            staged: false,
            days_visited: 30,
            posts_read_count: 500,
            topics_entered: 100,
            post_count: 50
        }

        // First page with data
        if (!config.params || (typeof config.params === 'object' && (!config.params['page'] || config.params['page'] === '1'))) {
            yield [mockUser] as T[];
        }
        // Second page (empty)
        else {
            yield [] as T[];
        }
    }

    async batchSave<T extends object>(results: T[], model: string): Promise<boolean | null> {
        console.log('batchSave called with:', JSON.stringify(results, null, 2));
        console.log('model:', model);
        if (results.length > 0) {
            savedUsers = [...savedUsers, ...(results as User[])];
        }
        console.log('savedUsers before assertions:', JSON.stringify(savedUsers, null, 2));
        return true;
    }

    async deleteRecordsFromPreviousExecutions(model: string): Promise<any> {
        // Mock deletion logic if needed
    };
}

describe('Discourse Active Users Pagination', () => {
    beforeEach(() => {
        savedUsers = [];
    });

    it('should configure offset-based pagination correctly', async () => {
        const nango = new MockNango() as unknown as NangoSync;
        const fetchData = (await import('../syncs/active-users')).default;
        await fetchData.exec(nango);

        expect(savedUsers).toHaveLength(1);
        expect(savedUsers[0]).toEqual({
            id: "123",
            username: 'johndoe',
            name: 'John Doe',
            admin: true
        });
    });

    it('should handle empty pages', async () => {
        const nango = new MockNango() as unknown as NangoSync;
        const fetchData = (await import('../syncs/active-users')).default;
        await fetchData.exec(nango);

        // After the first page with data, we get an empty page
        // The test should pass with only the users from the first page
        expect(savedUsers).toHaveLength(1);
    });

    it('should handle pagination errors', async () => {
        const nango = new MockNango() as unknown as NangoSync;
        nango.paginate = async function* <T>(): AsyncGenerator<T[], undefined, undefined> {
            throw new Error('Pagination error');
        };

        const fetchData = (await import('../syncs/active-users')).default;
        await expect(fetchData.exec(nango)).rejects.toThrow('Pagination error');
    });
});
