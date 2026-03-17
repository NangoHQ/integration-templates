import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/mark-as-read.js';

describe('slack-crmk mark-as-read tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'mark-as-read',
        Model: 'ActionOutput_slack_crmk_markasread'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
