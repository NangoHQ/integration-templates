import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-calendar-entry-priorities.js';

describe('pipelinecrm list-calendar-entry-priorities tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-calendar-entry-priorities',
        Model: 'ActionOutput_pipelinecrm_listcalendarentrypriorities'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
