import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/preview-schedule.js';

describe('pagerduty preview-schedule tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'preview-schedule',
        Model: 'ActionOutput_pagerduty_previewschedule'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
