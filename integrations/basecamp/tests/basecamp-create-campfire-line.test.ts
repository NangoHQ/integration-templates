import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-campfire-line.js';

describe('basecamp create-campfire-line tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-campfire-line',
        Model: 'ActionOutput_basecamp_createcampfireline'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
