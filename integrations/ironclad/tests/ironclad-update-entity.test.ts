import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-entity.js';

describe('ironclad update-entity tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-entity',
        Model: 'ActionOutput_ironclad_updateentity'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
