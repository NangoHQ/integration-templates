import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-feature-flag.js';

describe('posthog get-feature-flag tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-feature-flag',
        Model: 'ActionOutput_posthog_getfeatureflag'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
