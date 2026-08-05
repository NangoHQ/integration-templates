import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-daily-log.js';

describe('ingenious-build get-daily-log tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-daily-log',
        Model: 'ActionOutput_ingenious_build_getdailylog'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
