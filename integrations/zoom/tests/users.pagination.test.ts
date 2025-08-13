import { NangoSync, ProxyConfiguration } from "nango";
/// <reference types="vitest" />
import type { AxiosResponse } from 'axios';
import type { User } from '../models.js';
import type { ZoomUser } from '../types.js';
import fetchData from '../syncs/users.js';
import { describe, test, expect, vi, beforeEach } from 'vitest';

class MockNango {
    get: any;
    paginate: any;
    batchSave: any;
    lastSyncDate: Date | null;

    constructor() {
        this.get = vi.fn();
        this.paginate = vi.fn();
        this.batchSave = vi.fn();
        this.lastSyncDate = null;
    }
}

describe('Zoom Users Pagination', () => {
    let nango: NangoSync;
    let savedUsers: User[] = [];

    beforeEach(() => {
        nango = new MockNango() as unknown as NangoSync;
        savedUsers = [];

        // Mock paginate to yield two pages of users
        vi.spyOn(nango, 'paginate').mockImplementation(async function* <T>(config: ProxyConfiguration): AsyncGenerator<T[], undefined, void> {
            // First page
            yield [
                {
                    id: 'user123',
                    first_name: 'John',
                    last_name: 'Doe',
                    email: 'john@example.com',
                    type: 1,
                    zoom_workplace: 0,
                    on_prem: false,
                    display_name: 'John Doe',
                    pmi: 1234567890,
                    timezone: 'America/Los_Angeles',
                    verified: 1,
                    dept: 'Engineering',
                    created_at: '2024-01-01T00:00:00Z',
                    last_login_time: '2024-01-01T12:00:00Z',
                    pic_url: 'https://example.com/pic.jpg',
                    language: 'en-US',
                    phone_number: '+1234567890',
                    status: 'active',
                    role_id: 'role123',
                    user_created_at: '2024-01-01T00:00:00Z'
                }
            ] as T[];

            // Second page (empty to simulate end of pagination)
            yield [] as T[];
        });

        vi.spyOn(nango, 'batchSave').mockImplementation(async <T extends object>(results: T[], model: string): Promise<boolean> => {
            console.log('batchSave called with:', JSON.stringify(results, null, 2));
            console.log('model:', model);
            if (results.length > 0) {
                savedUsers = [...savedUsers, ...(results as User[])];
            }
            return true;
        });
    });

    test('should configure cursor-based pagination correctly', async () => {
        await fetchData.exec(nango);

        const paginateCalls = vi.mocked(nango.paginate).mock.calls;
        expect(paginateCalls).toHaveLength(1);

        // Verify pagination configuration
        const config = paginateCalls[0]?.[0] as ProxyConfiguration;
        expect(config.endpoint).toBe('users');
        expect(config.paginate).toEqual({
            type: 'cursor',
            cursor_name_in_request: 'next_page_token',
            cursor_path_in_response: 'next_page_token',
            response_path: 'users',
            limit_name_in_request: 'page_size'
        });

        // Log the state before assertions
        console.log('savedUsers before assertions:', JSON.stringify(savedUsers, null, 2));

        // Verify mapped data
        expect(savedUsers).toHaveLength(1);
        expect(savedUsers[0]).toEqual({
            id: 'user123',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com'
        });
    });

    test('should handle empty pages', async () => {
        vi.spyOn(nango, 'paginate').mockImplementation(async function* <T>(): AsyncGenerator<T[], undefined, void> {
            yield [] as T[];
        });

        await fetchData.exec(nango);

        expect(savedUsers).toHaveLength(0);
        expect(nango.paginate).toHaveBeenCalledTimes(1);
    });

    test('should handle pagination errors', async () => {
        vi.spyOn(nango, 'paginate').mockImplementation(async function* () {
            throw new Error('Pagination failed');
        });

        await expect(fetchData.exec(nango)).rejects.toThrow('Pagination failed');
    });
});
