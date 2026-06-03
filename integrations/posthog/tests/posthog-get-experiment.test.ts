import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-experiment.js';

describe('posthog get-experiment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-experiment',
        Model: 'ActionOutput_posthog_getexperiment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
