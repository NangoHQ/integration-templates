import { vi, expect, it, describe } from "vitest";
import type { NangoSync } from "../models.js";

import fetchData from "../syncs/contacts.js";

describe("intercom contacts tests", () => {
  const nangoMock = new global.vitest.NangoSyncMock({ 
      dirname: __dirname,
      name: "contacts",
      Model: "IntercomContact"
  });
  it("should get, map correctly the data and batchSave the result", async () => {
    await fetchData(nangoMock);

    const batchSaveData = await nangoMock.getBatchSaveData();
    expect(nangoMock.batchSave).toHaveBeenCalledWith(batchSaveData, "IntercomContact");
  });

  it('should get, map correctly the data and batchDelete the result', async () => {
      await fetchData(nangoMock);

      const batchDeleteData = await nangoMock.getBatchDeleteData();
      if (batchDeleteData && batchDeleteData.length > 0) {
          expect(nangoMock.batchDelete).toHaveBeenCalledWith(batchDeleteData, "IntercomContact");
      }
  });
});
