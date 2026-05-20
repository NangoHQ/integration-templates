import { vi, expect, it, describe, beforeEach } from 'vitest';

import createAction from '../actions/get-job-profile.js';
import soap from 'soap';

describe('workday get-job-profile tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-job-profile',
        Model: 'ActionOutput_workday_getjobprofile'
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const output = await nangoMock.getOutput();

        // Mock the connection
        vi.spyOn(nangoMock, 'getConnection').mockResolvedValue({
            credentials: {
                type: 'BASIC',
                username: 'testuser@testtenant',
                password: 'testpass'
            },
            connection_config: {
                hostname: 'test.workday.com',
                tenant: 'testtenant'
            }
        } as any);

        // Create mock SOAP client
        const mockClient = {
            addHttpHeader: vi.fn(),
            setSecurity: vi.fn(),
            setEndpoint: vi.fn(),
            Get_Job_ProfilesAsync: vi.fn().mockResolvedValue([
                {
                    Response_Data: {
                        Job_Profile: [
                            {
                                Job_Profile_Reference: {
                                    ID: [
                                        {
                                            attributes: { 'wd:type': 'WID' },
                                            $value: 'wid123'
                                        },
                                        {
                                            attributes: { 'wd:type': 'Job_Profile_ID' },
                                            $value: output.id
                                        }
                                    ]
                                },
                                Job_Profile_Data: {
                                    Job_Profile_Name: output.name,
                                    Inactive: output.inactive ? '1' : '0'
                                }
                            }
                        ]
                    }
                },
                ''
            ])
        };

        vi.spyOn(soap, 'createClientAsync').mockResolvedValue(mockClient as any);
        vi.spyOn(soap, 'WSSecurity').mockImplementation(function () {
            return {};
        } as any);

        const response = await createAction.exec(nangoMock, input);

        expect(response).toEqual(output);
    });
});
