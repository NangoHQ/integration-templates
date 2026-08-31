import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-campfire-line.js';

describe('basecamp delete-campfire-line tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-campfire-line',
        Model: 'ActionOutput_basecamp_deletecampfireline'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
