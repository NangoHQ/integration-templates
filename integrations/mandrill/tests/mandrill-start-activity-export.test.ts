import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/start-activity-export.js';

describe('mandrill start-activity-export tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'start-activity-export',
        Model: 'ActionOutput_mandrill_startactivityexport'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
