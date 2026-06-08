import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-early-access-feature.js';

describe('posthog create-early-access-feature tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-early-access-feature',
        Model: 'ActionOutput_posthog_createearlyaccessfeature'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
