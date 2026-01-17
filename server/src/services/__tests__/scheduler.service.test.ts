import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateSummary: vi.fn(),
  schedule: vi.fn(),
  taskStop: vi.fn(),
  config: {
    scheduler: { cronTime: "0 8 * * *" },
  },
}));

vi.mock("../summary.service", () => ({
  summaryService: {
    generateSummaryForTopic: mocks.generateSummary,
  },
}));

vi.mock("../config", () => ({
  config: mocks.config,
}));

vi.mock("node-cron", () => ({
  default: {
    schedule: mocks.schedule,
  },
}));

import { SchedulerService } from "../scheduler.service";

describe("SchedulerService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.schedule.mockReturnValue({ stop: mocks.taskStop });
  });

  it("schedules and stops the cron task", () => {
    const service = new SchedulerService();

    service.start();

    expect(mocks.schedule).toHaveBeenCalledTimes(1);
    expect(mocks.schedule).toHaveBeenCalledWith(
      mocks.config.scheduler.cronTime,
      expect.any(Function)
    );

    service.stop();
    expect(mocks.taskStop).toHaveBeenCalledTimes(1);
  });

  it("runs the scheduled task immediately", async () => {
    const service = new SchedulerService();

    await service.runNow();

    expect(mocks.generateSummary).toHaveBeenCalledTimes(1);
    expect(mocks.generateSummary).toHaveBeenCalledWith("AI");
  });
});
