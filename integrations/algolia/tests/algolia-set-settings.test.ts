import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/set-settings.js';

describe('algolia set-settings tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'set-settings',
        Model: 'ActionOutput_algolia_setsettings'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
