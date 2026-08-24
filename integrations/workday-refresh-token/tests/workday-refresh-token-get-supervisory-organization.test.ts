import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-supervisory-organization.js';

describe('workday-refresh-token get-supervisory-organization tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-supervisory-organization',
        Model: 'ActionOutput_workday_refresh_token_getsupervisoryorganization'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
