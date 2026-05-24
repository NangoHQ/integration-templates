import { vi, expect, it, describe, beforeEach } from 'vitest';

import createAction from '../actions/list-positions.js';

vi.mock('soap', async (importOriginal) => {
    const mod = await importOriginal();
    return {
        ...mod,
        default: {
            ...mod.default,
            createClientAsync: vi.fn()
        },
        security: {
            WSSecurity: vi.fn(function () {})
        }
    };
});

describe('workday list-positions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-positions',
        Model: 'ActionOutput_workday_listpositions'
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const output = await nangoMock.getOutput();

        const mockConnection = {
            credentials: {
                type: 'BASIC',
                username: 'test_user@test_tenant',
                password: 'test_password'
            },
            connection_config: {
                hostname: 'test.workday.com',
                tenant: 'test_tenant'
            }
        };

        vi.spyOn(nangoMock, 'getConnection').mockResolvedValue(mockConnection);

        const mockClient = {
            addHttpHeader: vi.fn(),
            setSecurity: vi.fn(),
            setEndpoint: vi.fn(),
            Get_PositionsAsync: vi.fn().mockResolvedValue([
                {
                    Response_Results: {
                        Total_Results: 0,
                        Total_Pages: 0,
                        Page: 1,
                        Page_Results: 0
                    },
                    Response_Data: {}
                },
                ''
            ])
        };

        const { default: soapDefault } = await import('soap');
        soapDefault.createClientAsync.mockResolvedValue(mockClient);

        const response = await createAction.exec(nangoMock, input);

        expect(response).toEqual(output);
    });
});
