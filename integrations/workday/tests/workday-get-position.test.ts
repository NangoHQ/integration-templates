import { vi, expect, it, describe, beforeEach } from 'vitest';

import createAction from '../actions/get-position.js';

// Mock the soap module
vi.mock('soap', () => ({
    default: {
        createClientAsync: vi.fn().mockResolvedValue({
            addHttpHeader: vi.fn(),
            setSecurity: vi.fn(),
            setEndpoint: vi.fn(),
            Get_PositionsAsync: vi.fn().mockResolvedValue([
                {
                    Response_Data: [
                        {
                            Position: [
                                {
                                    Position_Reference: {
                                        ID: [
                                            { attributes: { 'wd:type': 'WID' }, $value: 'test-wid' },
                                            { attributes: { 'wd:type': 'Position_ID' }, $value: 'P-00030' }
                                        ]
                                    },
                                    Position_Data: {
                                        Effective_Date: 'Thu Jun 11 2020 00:00:00 GMT+0000 (Coordinated Universal Time)',
                                        Closed: false,
                                        Position_Definition_Data: {
                                            Position_ID: 'P-00030',
                                            Job_Posting_Title: 'Senior IT Analyst'
                                        },
                                        Position_Status_Reference: [
                                            {
                                                ID: [{ attributes: { 'wd:type': 'WID' }, $value: 'status-wid' }]
                                            }
                                        ]
                                    }
                                }
                            ]
                        }
                    ]
                },
                '<xml>mock</xml>'
            ])
        }),
        WSSecurity: vi.fn()
    }
}));

describe('workday get-position tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-position',
        Model: 'ActionOutput_workday_getposition'
    });

    beforeEach(() => {
        // @ts-expect-error - mocking getConnection for SOAP authentication
        nangoMock.getConnection.mockResolvedValue({
            credentials: {
                type: 'BASIC',
                username: 'test_user@tenant',
                password: 'test_password'
            },
            connection_config: {
                hostname: 'test.workday.com',
                tenant: 'test_tenant'
            }
        });
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
