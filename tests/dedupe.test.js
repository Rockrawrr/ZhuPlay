import { describe, expect, it } from "vitest";
import {
  fileFingerprint,
  filterDuplicateFiles,
  songFingerprint,
} from "../src/utils/dedupe";

const file = (name, size) => ({ name, size });

describe("songFingerprint / fileFingerprint", () => {
  it("文件名小写 + 大小", () => {
    expect(songFingerprint({ filename: "Song.MP3", fileSize: 100 })).toBe(
      "song.mp3|100",
    );
    expect(fileFingerprint(file("Song.MP3", 100))).toBe("song.mp3|100");
  });

  it("缺字段时不报错", () => {
    expect(songFingerprint({})).toBe("|0");
    expect(songFingerprint(null)).toBe("|0");
  });
});

describe("filterDuplicateFiles", () => {
  const existing = [
    { id: "1", filename: "a.mp3", fileSize: 100, filePath: "D:/music/a.mp3" },
    { id: "2", filename: "b.mp3", fileSize: 200 },
  ];

  it("挡掉已在库里的文件（同名同大小）", () => {
    const { fresh, duplicates } = filterDuplicateFiles(
      [file("a.mp3", 100), file("c.mp3", 300)],
      existing,
    );

    expect(duplicates.map((item) => item.name)).toEqual(["a.mp3"]);
    expect(fresh.map((item) => item.name)).toEqual(["c.mp3"]);
  });

  it("大小不同视为不同文件", () => {
    const { fresh, duplicates } = filterDuplicateFiles(
      [file("a.mp3", 999)],
      existing,
    );

    expect(duplicates).toHaveLength(0);
    expect(fresh).toHaveLength(1);
  });

  it("桌面端路径相同也挡掉（即使改名）", () => {
    const { duplicates } = filterDuplicateFiles(
      [file("renamed.mp3", 100)],
      existing,
      () => "D:/music/a.mp3",
    );

    expect(duplicates.map((item) => item.name)).toEqual(["renamed.mp3"]);
  });

  it("同批次重复选中同一个文件只保留一份", () => {
    const { fresh, duplicates } = filterDuplicateFiles(
      [file("x.mp3", 10), file("x.mp3", 10)],
      [],
    );

    expect(fresh).toHaveLength(1);
    expect(duplicates).toHaveLength(1);
  });

  it("空输入返回空结果", () => {
    expect(filterDuplicateFiles([], existing)).toEqual({
      fresh: [],
      duplicates: [],
    });
  });
});
