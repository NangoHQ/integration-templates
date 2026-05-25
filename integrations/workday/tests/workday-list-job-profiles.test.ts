import { vi, expect, it, describe, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Read the expected output from test.json to use in mock
function getMockJobProfiles() {
    const testJsonPath = path.join(__dirname, 'list-job-profiles.test.json');
    const testJson = JSON.parse(fs.readFileSync(testJsonPath, 'utf8'));
    const expectedOutput = testJson.output;

    // Convert expected output items to SOAP response format
    return expectedOutput.items.map((item: any) => ({
        Job_Profile_Reference: {
            ID: [
                { attributes: { 'wd:type': 'WID' }, $value: item.id },
                { attributes: { 'wd:type': 'Job_Profile_ID' }, $value: item.reference_id }
            ]
        },
        Job_Profile_Data: {
            Name: item.name,
            Inactive: item.inactive ? '1' : '0',
            Description: item.description,
            Effective_Date: item.effective_date
        }
    }));
}

// Mock the soap module
vi.mock('soap', () => ({
    default: {
        createClientAsync: vi.fn().mockResolvedValue({
            addHttpHeader: vi.fn(),
            setSecurity: vi.fn(),
            setEndpoint: vi.fn(),
            Get_Job_ProfilesAsync: vi.fn().mockImplementation(async () => {
                const mockJobProfiles = getMockJobProfiles();
                return [
                    {
                        Response_Data: {
                            Job_Profile: mockJobProfiles
                        },
                        Response_Results: {
                            Total_Pages: 1,
                            Page: 1
                        }
                    },
                    ''
                ];
            })
        }),
        WSSecurity: class WSSecurity {
            constructor() {}
        }
    }
}));

import createAction from '../actions/list-job-profiles.js';

describe('workday list-job-profiles tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-job-profiles',
        Model: 'ActionOutput_workday_listjobprofiles'
    });

    beforeEach(() => {
        // Mock connection for SOAP authentication
        nangoMock.getConnection = vi.fn().mockResolvedValue({
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
