import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-supervisory-organizations.js';

describe('workday-refresh-token list-supervisory-organizations tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-supervisory-organizations',
        Model: 'ActionOutput_workday_refresh_token_listsupervisoryorganizations'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
