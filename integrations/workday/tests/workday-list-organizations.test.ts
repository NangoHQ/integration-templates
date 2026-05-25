import { vi, expect, it, describe, beforeEach } from 'vitest';

// Mock the soap module before importing the action
vi.mock('soap', () => ({
    default: {
        createClientAsync: vi.fn().mockResolvedValue({
            addHttpHeader: vi.fn(),
            setSecurity: vi.fn(),
            setEndpoint: vi.fn(),
            Get_OrganizationsAsync: vi.fn().mockResolvedValue([
                {
                    Response_Data: {
                        Organization: []
                    },
                    Response_Results: {
                        Page: 1,
                        Total_Pages: 1
                    }
                },
                ''
            ])
        }),
        WSSecurity: vi.fn()
    }
}));

import createAction from '../actions/list-organizations.js';

describe('workday list-organizations tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-organizations',
        Model: 'ActionOutput_workday_listorganizations'
    });

    beforeEach(() => {
        // Mock connection data for SOAP client
        nangoMock.getConnection = vi.fn().mockResolvedValue({
            credentials: {
                type: 'BASIC',
                username: 'test_user@tenant',
                password: 'test_password'
            },
            connection_config: {
                hostname: 'test-host.workday.com',
                tenant: 'test_tenant'
            }
        });
    });

    it('should return a list of organizations', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);

        // Verify response structure
        expect(response).toHaveProperty('items');
        expect(Array.isArray(response.items)).toBe(true);
    });
});
