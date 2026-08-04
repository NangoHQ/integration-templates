import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-on-call-schedule.js';

describe('datadog create-on-call-schedule tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-on-call-schedule',
        Model: 'ActionOutput_datadog_createoncallschedule'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
