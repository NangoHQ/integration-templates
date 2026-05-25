import { vi, expect, it, describe, beforeEach } from 'vitest';

import createAction from '../actions/get-worker.js';

const mockSoapClient = {
    addHttpHeader: vi.fn(),
    setSecurity: vi.fn(),
    setEndpoint: vi.fn(),
    Get_WorkersAsync: vi.fn()
};

vi.mock('soap', () => ({
    default: {
        createClientAsync: vi.fn(async () => mockSoapClient),
        WSSecurity: vi.fn(function () {
            return { mock: 'security' };
        })
    }
}));

describe('workday get-worker tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-worker',
        Model: 'ActionOutput_workday_getworker'
    });

    beforeEach(() => {
        vi.clearAllMocks();

        nangoMock.getConnection = vi.fn(async () => ({
            credentials: {
                type: 'BASIC',
                username: 'test_user@tenant',
                password: 'test_password'
            },
            connection_config: {
                hostname: 'test.workday.com',
                tenant: 'test_tenant'
            }
        }));

        mockSoapClient.Get_WorkersAsync.mockResolvedValue([
            {
                Response_Data: {
                    Worker: [
                        {
                            Worker_Reference: {
                                ID: []
                            },
                            Employment_Data: [
                                {
                                    Worker_Status_Data: {
                                        Active: '0'
                                    }
                                }
                            ]
                        }
                    ]
                }
            },
            ''
        ]);
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
