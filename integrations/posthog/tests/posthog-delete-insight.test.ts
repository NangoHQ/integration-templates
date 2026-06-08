import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-insight.js';

describe('posthog delete-insight tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-insight',
        Model: 'ActionOutput_posthog_deleteinsight'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
