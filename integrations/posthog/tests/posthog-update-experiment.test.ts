import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-experiment.js';

describe('posthog update-experiment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-experiment',
        Model: 'ActionOutput_posthog_updateexperiment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
