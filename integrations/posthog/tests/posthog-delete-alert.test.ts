import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-alert.js';

describe('posthog delete-alert tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-alert',
        Model: 'ActionOutput_posthog_deletealert'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
