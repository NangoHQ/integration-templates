import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-project.js';

describe('asana delete-project tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-project',
        Model: 'ActionOutput_asana_deleteproject'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
