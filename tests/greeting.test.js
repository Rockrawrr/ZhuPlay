import { describe, expect, it } from "vitest";
import { currentGreeting, greetingForHour } from "../src/utils/greeting";

const at = (hour, minute = 0) => new Date(2026, 0, 1, hour, minute);

describe("greetingForHour", () => {
  it("按时间段返回问候语", () => {
    expect(greetingForHour(5)).toBe("早上好");
    expect(greetingForHour(9)).toBe("早上好");
    expect(greetingForHour(11)).toBe("中午好");
    expect(greetingForHour(12)).toBe("中午好");
    expect(greetingForHour(13)).toBe("下午好");
    expect(greetingForHour(17)).toBe("下午好");
    expect(greetingForHour(18)).toBe("晚上好");
    expect(greetingForHour(23)).toBe("晚上好");
  });

  it("凌晨也算晚上", () => {
    expect(greetingForHour(0)).toBe("晚上好");
    expect(greetingForHour(4)).toBe("晚上好");
  });

  it("异常输入返回兜底文案", () => {
    expect(greetingForHour(undefined)).toBe("你好");
    expect(greetingForHour("abc")).toBe("你好");
  });
});

describe("currentGreeting", () => {
  it("按传入时间取小时", () => {
    expect(currentGreeting(at(8))).toBe("早上好");
    expect(currentGreeting(at(12, 30))).toBe("中午好");
    expect(currentGreeting(at(15))).toBe("下午好");
    expect(currentGreeting(at(21))).toBe("晚上好");
  });
});
