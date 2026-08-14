import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-calendar-entry.js';

describe('pipelinecrm update-calendar-entry tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-calendar-entry',
        Model: 'ActionOutput_pipelinecrm_updatecalendarentry'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
