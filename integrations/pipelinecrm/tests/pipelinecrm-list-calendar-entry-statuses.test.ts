import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-calendar-entry-statuses.js';

describe('pipelinecrm list-calendar-entry-statuses tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-calendar-entry-statuses',
        Model: 'ActionOutput_pipelinecrm_listcalendarentrystatuses'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
