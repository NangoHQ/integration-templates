import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-feature-flags.js';

describe('posthog list-feature-flags tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-feature-flags',
        Model: 'ActionOutput_posthog_listfeatureflags'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
