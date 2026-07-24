import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-work-schedules.js';

describe('workable list-work-schedules tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-work-schedules',
        Model: 'ActionOutput_workable_listworkschedules'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
