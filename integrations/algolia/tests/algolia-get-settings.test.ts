import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-settings.js';

describe('algolia get-settings tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-settings',
        Model: 'ActionOutput_algolia_getsettings'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
