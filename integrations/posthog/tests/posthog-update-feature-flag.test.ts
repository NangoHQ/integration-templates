import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-feature-flag.js';

describe('posthog update-feature-flag tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-feature-flag',
        Model: 'ActionOutput_posthog_updatefeatureflag'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
