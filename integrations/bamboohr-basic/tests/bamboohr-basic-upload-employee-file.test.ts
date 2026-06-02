import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/upload-employee-file.js';

describe('bamboohr upload-employee-file tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'upload-employee-file',
        Model: 'ActionOutput_bamboohr_uploademployeefile'
    });

    it('should output the action output that is expected', async () => {
        (nangoMock as any).getConnection = vi.fn().mockResolvedValue({
            credentials: { access_token: 'mocked-token' },
            connection_config: { subdomain: 'nagoinc' }
        });

        (nangoMock as any).uncontrolledFetch = vi.fn().mockResolvedValue({
            ok: true,
            headers: {
                get: (key: string) => (key === 'location' ? 'https://app.bamboohr.com/api/gateway.php/nagoinc/v1/employees/4/files/32' : null)
            },
            text: () => Promise.resolve('')
        });

        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
