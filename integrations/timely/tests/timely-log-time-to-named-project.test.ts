import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/log-time-to-named-project.js';

describe('timely log-time-to-named-project tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'log-time-to-named-project',
        Model: 'ActionOutput_timely_logtimetonamedproject'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
