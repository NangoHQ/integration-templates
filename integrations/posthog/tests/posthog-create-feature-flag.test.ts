import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-feature-flag.js';

describe('posthog create-feature-flag tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-feature-flag',
        Model: 'ActionOutput_posthog_createfeatureflag'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
