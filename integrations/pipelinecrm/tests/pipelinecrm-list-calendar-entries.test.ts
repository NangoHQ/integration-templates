import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-calendar-entries.js';

describe('pipelinecrm list-calendar-entries tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-calendar-entries',
        Model: 'ActionOutput_pipelinecrm_listcalendarentries'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
