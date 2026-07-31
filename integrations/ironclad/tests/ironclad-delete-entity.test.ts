import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-entity.js';

describe('ironclad delete-entity tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-entity',
        Model: 'ActionOutput_ironclad_deleteentity'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
