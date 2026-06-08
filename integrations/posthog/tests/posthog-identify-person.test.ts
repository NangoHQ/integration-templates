import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/identify-person.js';

describe('posthog identify-person tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'identify-person',
        Model: 'ActionOutput_posthog_identifyperson'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
