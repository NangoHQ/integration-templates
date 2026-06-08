import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-early-access-feature.js';

describe('posthog delete-early-access-feature tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-early-access-feature',
        Model: 'ActionOutput_posthog_deleteearlyaccessfeature'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
