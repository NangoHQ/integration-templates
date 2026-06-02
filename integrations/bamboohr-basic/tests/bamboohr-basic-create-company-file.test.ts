import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-company-file.js';

describe('bamboohr create-company-file tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-company-file',
        Model: 'ActionOutput_bamboohr_createcompanyfile'
    });

    it('should output the action output that is expected', async () => {
        nangoMock.getConnection = vi.fn().mockResolvedValue({
            connection_config: { subdomain: 'nagoinc' }
        });
        (nangoMock as any).getToken = vi.fn().mockResolvedValue({ access_token: 'mocked-token' });
        (nangoMock as any).uncontrolledFetch = vi.fn().mockResolvedValue({
            ok: true,
            headers: {
                get: (name: string) => {
                    if (name.toLowerCase() === 'location') {
                        return 'https://app.bamboohr.com/api/gateway.php/nagoinc/v1/files/698';
                    }
                    return null;
                }
            }
        });

        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
