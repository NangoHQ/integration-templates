import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/unsubscribe-profiles.js';

describe('klaviyo unsubscribe-profiles tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'unsubscribe-profiles',
        Model: 'ActionOutput_klaviyo_unsubscribeprofiles'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
