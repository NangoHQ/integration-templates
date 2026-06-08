import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-time-off-requests.js';

describe('bamboohr list-time-off-requests tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-time-off-requests',
        Model: 'ActionOutput_bamboohr_listtimeoffrequests'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
