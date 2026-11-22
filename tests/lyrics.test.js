import { describe, expect, it } from "vitest";
import { findLyricIndex, parseLyrics } from "../src/utils/lyrics";

describe("parseLyrics", () => {
  it("解析带时间轴的 LRC", () => {
    const result = parseLyrics("[00:05.50]第二句\n[00:01.00]第一句");

    expect(result.synced).toBe(true);
    expect(result.lines).toEqual([
      { time: 1, text: "第一句" },
      { time: 5.5, text: "第二句" },
    ]);
  });

  it("一行多个时间戳会展开成多行", () => {
    const result = parseLyrics("[00:01.00][00:03.00]重复的副歌");

    expect(result.lines).toEqual([
      { time: 1, text: "重复的副歌" },
      { time: 3, text: "重复的副歌" },
    ]);
  });

  it("忽略 [ar:] 这类元信息标签", () => {
    const result = parseLyrics("[ti:歌名]\n[ar:歌手]\n[00:02.00]正文");

    expect(result.lines).toEqual([{ time: 2, text: "正文" }]);
  });

  it("没有时间轴时按纯文本返回", () => {
    const result = parseLyrics("第一行\n\n第二行\n");

    expect(result.synced).toBe(false);
    expect(result.lines.map((line) => line.text)).toEqual(["第一行", "", "第二行"]);
    expect(result.lines.every((line) => line.time === -1)).toBe(true);
  });

  it("空输入不会抛错", () => {
    expect(parseLyrics("")).toEqual({ synced: false, lines: [] });
    expect(parseLyrics(null)).toEqual({ synced: false, lines: [] });
  });
});

describe("findLyricIndex", () => {
  const lines = [
    { time: 0, text: "a" },
    { time: 5, text: "b" },
    { time: 10, text: "c" },
  ];

  it("返回当前时间对应的下标（含 0.2s 提前高亮）", () => {
    expect(findLyricIndex(lines, 0)).toBe(0);
    expect(findLyricIndex(lines, 4.7)).toBe(0);
    expect(findLyricIndex(lines, 4.9)).toBe(1);
    expect(findLyricIndex(lines, 5)).toBe(1);
    expect(findLyricIndex(lines, 12)).toBe(2);
  });

  it("纯文本或空数组返回 -1", () => {
    expect(findLyricIndex([{ time: -1, text: "x" }], 10)).toBe(-1);
    expect(findLyricIndex([], 10)).toBe(-1);
  });
});
