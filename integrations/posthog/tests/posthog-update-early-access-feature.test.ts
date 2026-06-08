import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-early-access-feature.js';

describe('posthog update-early-access-feature tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-early-access-feature',
        Model: 'ActionOutput_posthog_updateearlyaccessfeature'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
