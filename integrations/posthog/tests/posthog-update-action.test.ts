import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-action.js';

describe('posthog update-action tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-action',
        Model: 'ActionOutput_posthog_updateaction'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
