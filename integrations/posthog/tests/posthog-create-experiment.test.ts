import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-experiment.js';

describe('posthog create-experiment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-experiment',
        Model: 'ActionOutput_posthog_createexperiment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
