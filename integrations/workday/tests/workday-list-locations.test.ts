import { vi, expect, it, describe, beforeEach } from 'vitest';

import createAction from '../actions/list-locations.js';

// Mock the soap module to avoid real network calls
vi.mock('soap', async () => {
    const { readFileSync } = await import('fs');
    const { fileURLToPath } = await import('url');
    const { dirname, join } = await import('path');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const testJsonPath = join(__dirname, 'list-locations.test.json');
    const testData = JSON.parse(readFileSync(testJsonPath, 'utf-8'));

    return {
        default: {
            createClientAsync: vi.fn().mockResolvedValue({
                addHttpHeader: vi.fn(),
                setSecurity: vi.fn(),
                setEndpoint: vi.fn(),
                Get_LocationsAsync: vi.fn().mockResolvedValue([
                    {
                        Response_Results: {
                            Total_Pages: 1,
                            Page: 1
                        },
                        Response_Data: {
                            Location: testData.output.items.map((item: { id: string; name: string; country?: string; inactive: boolean }) => ({
                                Location_Reference: {
                                    ID: [{ attributes: { 'wd:type': 'Location_ID' }, $value: item.id }]
                                },
                                Location_Data: {
                                    Location_Name: item.name,
                                    Inactive: item.inactive ? '1' : '0',
                                    ...(item.country && {
                                        Contact_Data: {
                                            Address_Data: [
                                                {
                                                    Country_Reference: {
                                                        ID: [{ attributes: { 'wd:type': 'ISO_3166-1_Alpha-2_Code' }, $value: item.country }]
                                                    }
                                                }
                                            ]
                                        }
                                    })
                                }
                            }))
                        }
                    },
                    ''
                ])
            }),
            WSSecurity: vi.fn()
        }
    };
});

describe('workday list-locations tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-locations',
        Model: 'ActionOutput_workday_listlocations'
    });

    beforeEach(() => {
        // @allowTryCatch: Mock connection for SOAP authentication
        nangoMock.getConnection = vi.fn().mockResolvedValue({
            credentials: {
                type: 'BASIC',
                username: 'test_user@tenant',
                password: 'test_password'
            },
            connection_config: {
                hostname: 'test-hostname.workday.com',
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
