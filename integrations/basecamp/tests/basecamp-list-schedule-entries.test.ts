import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-schedule-entries.js';

describe('basecamp list-schedule-entries tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-schedule-entries',
        Model: 'ActionOutput_basecamp_listscheduleentries'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
