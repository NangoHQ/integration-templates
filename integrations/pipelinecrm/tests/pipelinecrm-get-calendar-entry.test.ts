import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-calendar-entry.js';

describe('pipelinecrm get-calendar-entry tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-calendar-entry',
        Model: 'ActionOutput_pipelinecrm_getcalendarentry'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
