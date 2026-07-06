import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-opportunity-tags.js';

describe('lever-basic update-opportunity-tags tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-opportunity-tags',
        Model: 'ActionOutput_lever_basic_updateopportunitytags'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
