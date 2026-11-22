import { describe, expect, it } from "vitest";
import {
  formatBytes,
  formatDate,
  formatDuration,
  formatTime,
} from "../src/utils/format";

describe("formatTime", () => {
  it("按分秒格式化", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(65)).toBe("1:05");
    expect(formatTime(3599)).toBe("59:59");
  });

  it("超过一小时带上小时", () => {
    expect(formatTime(3600)).toBe("1:00:00");
    expect(formatTime(3725)).toBe("1:02:05");
  });

  it("无效值使用兜底文案", () => {
    expect(formatTime(NaN)).toBe("--:--");
    expect(formatTime(-1)).toBe("--:--");
    expect(formatTime(NaN, "未知")).toBe("未知");
  });
});

describe("formatDuration", () => {
  it("口语化时长", () => {
    expect(formatDuration(30)).toBe("30 秒");
    expect(formatDuration(90)).toBe("1 分 30 秒");
    expect(formatDuration(3600)).toBe("1 小时 0 分");
    expect(formatDuration(7380)).toBe("2 小时 3 分");
  });

  it("异常值归零", () => {
    expect(formatDuration(undefined)).toBe("0 秒");
    expect(formatDuration(-10)).toBe("0 秒");
  });
});

describe("formatBytes", () => {
  it("按 1024 进制换算", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("formatDate", () => {
  it("空值返回空串", () => {
    expect(formatDate(0)).toBe("");
  });

  it("输出 zh-CN 日期", () => {
    const text = formatDate(new Date(2026, 0, 2).getTime());
    expect(text).toContain("2026");
  });
});
