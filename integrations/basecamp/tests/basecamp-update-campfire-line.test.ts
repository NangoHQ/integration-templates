import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-campfire-line.js';

describe('basecamp update-campfire-line tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-campfire-line',
        Model: 'ActionOutput_basecamp_updatecampfireline'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
