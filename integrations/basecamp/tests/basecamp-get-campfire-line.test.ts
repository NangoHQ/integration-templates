import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-campfire-line.js';

describe('basecamp get-campfire-line tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-campfire-line',
        Model: 'ActionOutput_basecamp_getcampfireline'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
