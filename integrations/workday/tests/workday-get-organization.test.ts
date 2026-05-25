import { vi, expect, it, describe, beforeEach } from 'vitest';

import createAction from '../actions/get-organization.js';
import soap from 'soap';

describe('workday get-organization tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-organization',
        Model: 'ActionOutput_workday_getorganization'
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const output = await nangoMock.getOutput();

        // Create mock SOAP client
        const mockClient = {
            addHttpHeader: vi.fn(),
            setSecurity: vi.fn(),
            setEndpoint: vi.fn(),
            Get_OrganizationsAsync: vi.fn().mockResolvedValue([
                {
                    Response_Data: {
                        Organization: [
                            {
                                Organization_Reference: {
                                    ID: [
                                        {
                                            attributes: { 'wd:type': 'WID' },
                                            $value: 'wid123'
                                        },
                                        {
                                            attributes: { 'wd:type': 'Organization_Reference_ID' },
                                            $value: output.id
                                        }
                                    ]
                                },
                                Organization_Data: {
                                    Name: output.name,
                                    Organization_Type_Reference: {
                                        ID: [
                                            {
                                                attributes: { 'wd:type': 'Organization_Type_ID' },
                                                $value: output.type
                                            }
                                        ]
                                    },
                                    Organization_Subtype_Reference: {
                                        ID: [
                                            {
                                                attributes: { 'wd:type': 'Organization_Subtype_ID' },
                                                $value: output.subtype
                                            }
                                        ]
                                    },
                                    External_IDs_Data: {
                                        ID: [{ $value: output.external_id }]
                                    }
                                }
                            }
                        ]
                    }
                },
                ''
            ])
        };

        vi.spyOn(soap, 'createClientAsync').mockResolvedValue(mockClient as any);
        // WSSecurity is called with 'new' so it needs to be a proper constructor function
        vi.spyOn(soap, 'WSSecurity').mockImplementation(function () {
            return {};
        } as any);

        const response = await createAction.exec(nangoMock, input);

        expect(response).toEqual(output);
    });
});
