import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-calendar-entry.js';

describe('pipelinecrm create-calendar-entry tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-calendar-entry',
        Model: 'ActionOutput_pipelinecrm_createcalendarentry'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
