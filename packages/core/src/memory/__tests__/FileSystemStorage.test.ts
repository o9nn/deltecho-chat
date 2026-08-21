import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileSystemStorage } from "../FileSystemStorage";

describe("FileSystemStorage", () => {
  it("createIfMissing false does not mkdir", async () => {
    const missing = join(tmpdir(), `dte-missing-${Date.now()}-${Math.random()}`);
    const storage = new FileSystemStorage({
      storagePath: missing,
      createIfMissing: false,
    });
    await expect(storage.load("any")).rejects.toThrow();
    await expect(
      import("node:fs/promises").then((fs) => fs.access(missing)),
    ).rejects.toThrow();
  });

  it("createIfMissing true creates the directory", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dte-fs-"));
    await rm(dir, { recursive: true, force: true });
    const storage = new FileSystemStorage({
      storagePath: dir,
      createIfMissing: true,
    });
    await storage.save("k", "1");
    const info = await stat(dir);
    expect(info.isDirectory()).toBe(true);
    await rm(dir, { recursive: true, force: true });
  });
});
