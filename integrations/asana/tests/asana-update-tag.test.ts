import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-tag.js';

describe('asana update-tag tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-tag',
        Model: 'ActionOutput_asana_updatetag'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
