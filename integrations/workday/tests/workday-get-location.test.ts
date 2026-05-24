import { vi, expect, it, describe } from 'vitest';

vi.mock(import('soap'), async (importOriginal) => {
    const actual = await importOriginal();
    const mockedSoap = {
        ...actual,
        createClientAsync: vi.fn().mockResolvedValue({
            addHttpHeader: vi.fn(),
            setSecurity: vi.fn(),
            setEndpoint: vi.fn(),
            Get_LocationsAsync: vi.fn().mockResolvedValue([
                {
                    Response_Data: {
                        Location: [
                            {
                                Location_Reference: {
                                    ID: [{ attributes: { 'wd:type': 'Location_ID' }, $value: 'San_Francisco_site' }]
                                },
                                Location_Data: {
                                    Name: '',
                                    Inactive: '0'
                                }
                            }
                        ]
                    }
                },
                ''
            ])
        }),
        WSSecurity: vi.fn()
    };
    return {
        default: mockedSoap,
        ...mockedSoap
    };
});

import createAction from '../actions/get-location.js';

describe('workday get-location tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-location',
        Model: 'ActionOutput_workday_getlocation'
    });

    nangoMock.getConnection = vi.fn().mockResolvedValue({
        credentials: {
            type: 'BASIC',
            username: 'test_user',
            password: 'test_pass'
        },
        connection_config: {
            hostname: 'test.workday.com',
            tenant: 'test_tenant'
        }
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
