import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-attachment.js';

describe('asana delete-attachment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-attachment',
        Model: 'ActionOutput_asana_deleteattachment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
