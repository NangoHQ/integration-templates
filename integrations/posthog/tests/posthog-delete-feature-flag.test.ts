import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-feature-flag.js';

describe('posthog delete-feature-flag tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-feature-flag',
        Model: 'ActionOutput_posthog_deletefeatureflag'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
