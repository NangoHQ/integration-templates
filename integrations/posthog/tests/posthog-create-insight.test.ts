import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-insight.js';

describe('posthog create-insight tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-insight',
        Model: 'ActionOutput_posthog_createinsight'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
