import { expect, it, describe } from 'vitest';

import createAction from '../actions/batch-retrieve-catalog-objects.js';

describe('squareup-sandbox batch-retrieve-catalog-objects tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'batch-retrieve-catalog-objects',
        Model: 'ActionOutput_squareup_sandbox_batchretrievecatalogobjects'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
