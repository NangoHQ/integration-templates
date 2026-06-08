import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-insight.js';

describe('posthog get-insight tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-insight',
        Model: 'ActionOutput_posthog_getinsight'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
