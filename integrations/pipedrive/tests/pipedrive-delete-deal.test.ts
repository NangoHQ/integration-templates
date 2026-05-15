import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-deal.js';

describe('pipedrive delete-deal tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-deal',
        Model: 'ActionOutput_pipedrive_deletedeal'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
