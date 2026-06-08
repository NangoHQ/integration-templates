import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-early-access-features.js';

describe('posthog list-early-access-features tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-early-access-features',
        Model: 'ActionOutput_posthog_listearlyaccessfeatures'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
