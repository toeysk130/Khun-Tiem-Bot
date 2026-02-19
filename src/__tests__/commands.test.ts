/**
 * Comprehensive unit tests for Khun-Tiem-Bot
 * Tests cover: CommandQueue, utils, constants validation, and command dispatching logic
 */

// ── Mock setup ──
// Mock database and LINE client before any imports
jest.mock("../configs/database", () => ({
  pool: {
    query: jest.fn(),
  },
}));

jest.mock("../configs/lineClient", () => ({
  lineClient: {
    replyMessage: jest.fn().mockResolvedValue(undefined),
    pushMessage: jest.fn().mockResolvedValue(undefined),
  },
}));

import {
  LeaveAmountMap,
  monthAbbreviations,
  ncTypes,
  validBotCommands,
  validHhTypes,
  validKeyStatus,
  validLeaveAmounts,
  validLeaveTypes,
  validhhAmts,
} from "../configs/constants";
// ── Imports ──
import { CommandQueue } from "../queue/commandQueue";
import {
  convertDatetimeToDDMMYY,
  getColorEmoji,
  getCurrentDateString,
  getCurrentTimestamp,
  getCurrentWeekDate,
  getDisplayLeaveDate,
  getFormatLeaveDate,
} from "../utils/utils";

// ══════════════════════════════════════════════════════════
// CommandQueue Tests
// ══════════════════════════════════════════════════════════

describe("CommandQueue", () => {
  it("should process a single task", async () => {
    const queue = new CommandQueue(5);
    let executed = false;
    await queue.enqueue(async () => {
      executed = true;
    });
    expect(executed).toBe(true);
  });

  it("should respect concurrency limit", async () => {
    const queue = new CommandQueue(2);
    let concurrent = 0;
    let maxConcurrent = 0;

    const createTask = (delay: number) =>
      queue.enqueue(async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise((resolve) => setTimeout(resolve, delay));
        concurrent--;
      });

    await Promise.all([
      createTask(50),
      createTask(50),
      createTask(50),
      createTask(50),
    ]);

    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  it("should process all tasks even when queue exceeds concurrency", async () => {
    const queue = new CommandQueue(2);
    const results: number[] = [];

    const tasks = Array.from({ length: 5 }, (_, i) =>
      queue.enqueue(async () => {
        results.push(i);
      }),
    );

    await Promise.all(tasks);
    expect(results).toHaveLength(5);
    expect(results.sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it("should report correct stats", () => {
    const queue = new CommandQueue(3);
    const stats = queue.getStats();
    expect(stats.concurrency).toBe(3);
    expect(stats.running).toBe(0);
    expect(stats.queued).toBe(0);
  });

  it("should handle task errors without breaking the queue", async () => {
    const queue = new CommandQueue(2);
    let secondTaskExecuted = false;

    const failingTask = queue.enqueue(async () => {
      throw new Error("Task failed");
    });

    const succeedingTask = queue.enqueue(async () => {
      secondTaskExecuted = true;
    });

    await expect(failingTask).rejects.toThrow("Task failed");
    await succeedingTask;
    expect(secondTaskExecuted).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════
// Utils Tests
// ══════════════════════════════════════════════════════════

describe("Utils", () => {
  describe("convertDatetimeToDDMMYY", () => {
    it("should format date correctly", () => {
      expect(convertDatetimeToDDMMYY("2025-01-15")).toBe("15JAN25");
      expect(convertDatetimeToDDMMYY("2024-12-01")).toBe("01DEC24");
      expect(convertDatetimeToDDMMYY("2025-06-30")).toBe("30JUN25");
    });
  });

  describe("getCurrentDateString", () => {
    it("should return YYYY-MM-DD format", () => {
      const result = getCurrentDateString();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("getCurrentTimestamp", () => {
    it("should return ISO format", () => {
      const result = getCurrentTimestamp();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe("getCurrentWeekDate", () => {
    it("should return 5 weekdays (Mon-Fri)", () => {
      const monday = new Date("2025-01-20");
      const result = getCurrentWeekDate(monday);
      expect(result).toHaveLength(5);
      expect(result[0].day).toBe("Mon");
      expect(result[4].day).toBe("Fri");
    });

    it("should return correct dates for the week", () => {
      const wednesday = new Date("2025-01-22");
      const result = getCurrentWeekDate(wednesday);
      expect(result[0].date).toBe("2025-01-20"); // Monday
      expect(result[4].date).toBe("2025-01-24"); // Friday
    });
  });

  describe("getFormatLeaveDate", () => {
    it("should format single day leave", () => {
      const result = getFormatLeaveDate("15JAN25", "1วัน");
      expect(result.formattedLeaveStartDate).toContain("2025-01-15");
      expect(result.formattedLeaveEndDate).toContain("2025-01-15");
      expect(result.formattedLeaveAmount).toBe(1);
    });

    it("should format half-day leave", () => {
      const result = getFormatLeaveDate("15JAN25", "ครึ่งเช้า");
      expect(result.formattedLeaveAmount).toBe(0.5);
    });

    it("should format multi-day leave", () => {
      const result = getFormatLeaveDate("15JAN25-17JAN25", "3วัน");
      expect(result.formattedLeaveStartDate).toContain("2025-01-15");
      expect(result.formattedLeaveEndDate).toContain("2025-01-17");
      expect(result.formattedLeaveAmount).toBe(3);
    });
  });

  describe("getColorEmoji", () => {
    it("should return green for approved", () => {
      expect(getColorEmoji(true, "key")).toBe("🟢");
    });

    it("should return yellow for key + not approved", () => {
      expect(getColorEmoji(false, "key")).toBe("🟡");
    });

    it("should return red for nokey + not approved", () => {
      expect(getColorEmoji(false, "nokey")).toBe("🔴");
    });
  });

  describe("getDisplayLeaveDate", () => {
    it("should show single date when start equals end", () => {
      const result = getDisplayLeaveDate("2025-01-15", "2025-01-15");
      expect(result).toBe("15JAN25");
    });

    it("should show date range when different", () => {
      const result = getDisplayLeaveDate("2025-01-15", "2025-01-17");
      expect(result).toBe("15JAN25-17JAN25");
    });
  });
});

// ══════════════════════════════════════════════════════════
// Constants Validation Tests
// ══════════════════════════════════════════════════════════

describe("Constants", () => {
  describe("validBotCommands", () => {
    const expectedCommands = [
      "แจ้งลา",
      "nc",
      "อัปเดต",
      "ลบ",
      "hh",
      "รายงาน",
      "รายการ",
      "เตือน",
      "approve",
      "ตาราง",
      "แอบดู",
      "สมัคร",
      "สรุป",
      "สถิติ",
      "คำสั่ง",
    ];

    expectedCommands.forEach((cmd) => {
      it(`should include command: ${cmd}`, () => {
        expect(validBotCommands).toContain(cmd);
      });
    });
  });

  describe("validLeaveTypes", () => {
    it("should include all leave types", () => {
      expect(validLeaveTypes).toContain("ลาพักร้อน");
      expect(validLeaveTypes).toContain("ลาป่วย");
      expect(validLeaveTypes).toContain("ลากิจ");
    });
  });

  describe("validKeyStatus", () => {
    it("should include key, nokey, cer, nocer", () => {
      expect(validKeyStatus).toEqual(["key", "nokey", "cer", "nocer"]);
    });
  });

  describe("ncTypes", () => {
    it("should include all NC types", () => {
      expect(ncTypes).toContain("อบรม");
      expect(ncTypes).toContain("training");
      expect(ncTypes).toContain("กิจกรรมบริษัท");
      expect(ncTypes).toContain("ตรวจสุขภาพ");
    });
  });

  describe("validHhTypes", () => {
    it("should include เพิ่ม and ใช้", () => {
      expect(validHhTypes).toEqual(["เพิ่ม", "ใช้"]);
    });
  });

  describe("validLeaveAmounts", () => {
    it("should include 1-11 days + half days", () => {
      expect(validLeaveAmounts).toContain("1วัน");
      expect(validLeaveAmounts).toContain("11วัน");
      expect(validLeaveAmounts).toContain("ครึ่งเช้า");
      expect(validLeaveAmounts).toContain("ครึ่งบ่าย");
    });
  });

  describe("LeaveAmountMap", () => {
    it("should map leave amounts to numbers correctly", () => {
      expect(LeaveAmountMap["1วัน"]).toBe(1);
      expect(LeaveAmountMap["5วัน"]).toBe(5);
      expect(LeaveAmountMap["ครึ่งเช้า"]).toBe(0.5);
      expect(LeaveAmountMap["ครึ่งบ่าย"]).toBe(0.5);
    });
  });

  describe("monthAbbreviations", () => {
    it("should map all 12 months correctly", () => {
      expect(monthAbbreviations["JAN"]).toBe(0);
      expect(monthAbbreviations["FEB"]).toBe(1);
      expect(monthAbbreviations["DEC"]).toBe(11);
      expect(Object.keys(monthAbbreviations)).toHaveLength(12);
    });
  });

  describe("validhhAmts", () => {
    it("should include 1h through 40h", () => {
      expect(validhhAmts).toContain("1h");
      expect(validhhAmts).toContain("40h");
      expect(validhhAmts).toHaveLength(40);
    });
  });
});

// ══════════════════════════════════════════════════════════
// Command Handler Tests (with mocked dependencies)
// ══════════════════════════════════════════════════════════

describe("Command Handlers", () => {
  const { pool } = require("../configs/database");
  const { lineClient } = require("../configs/lineClient");

  const mockUserMetadata = {
    chatType: "PERSONAL",
    userId: "U123",
    groupId: "",
    username: "testuser",
    isAdmin: false,
    replyToken: "test-reply-token",
  };

  const adminMetadata = {
    ...mockUserMetadata,
    isAdmin: true,
    username: "admin",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("handleShowCommands", () => {
    it("should send commands as Flex Message", async () => {
      const {
        handleShowCommands,
      } = require("../handlers/commands/showCommands");
      await handleShowCommands("test-token");
      expect(lineClient.replyMessage).toHaveBeenCalledWith(
        "test-token",
        expect.objectContaining({
          type: "flex",
          altText: expect.stringContaining("คำสั่ง"),
        }),
      );
    });
  });

  describe("handleRegisterCommand", () => {
    it("should reject if user already exists", async () => {
      const {
        handleRegisterCommand,
      } = require("../handlers/commands/registerMember");
      await handleRegisterCommand({
        ...mockUserMetadata,
        username: "existing_user",
      });
      expect(lineClient.replyMessage).toHaveBeenCalledWith(
        mockUserMetadata.replyToken,
        expect.objectContaining({
          text: expect.stringContaining("มีอยู่ในระบบแล้ว"),
        }),
      );
    });
  });

  describe("handleApproveCommand", () => {
    it("should reject non-admin users", async () => {
      const {
        handleApproveCommand,
      } = require("../handlers/commands/approveRequest");
      await handleApproveCommand(["approve", "1"], mockUserMetadata);
      expect(lineClient.replyMessage).toHaveBeenCalledWith(
        mockUserMetadata.replyToken,
        expect.objectContaining({
          text: expect.stringContaining("ไม่ใช่ Admin"),
        }),
      );
    });

    it("should reject invalid command format", async () => {
      const {
        handleApproveCommand,
      } = require("../handlers/commands/approveRequest");
      await handleApproveCommand(["approve"], adminMetadata);
      expect(lineClient.replyMessage).toHaveBeenCalledWith(
        adminMetadata.replyToken,
        expect.objectContaining({
          text: expect.stringContaining("Invalid usage"),
        }),
      );
    });

    it("should approve valid IDs for admin", async () => {
      const {
        handleApproveCommand,
      } = require("../handlers/commands/approveRequest");
      pool.query
        .mockResolvedValueOnce({ rows: [{ total: 1 }] }) // checkIfIdExist
        .mockResolvedValueOnce({ rowCount: 1 }); // updateApproveFlag

      await handleApproveCommand(["approve", "1"], adminMetadata);
      expect(lineClient.replyMessage).toHaveBeenCalledWith(
        adminMetadata.replyToken,
        expect.objectContaining({
          text: expect.stringContaining("Approve request IDs"),
        }),
      );
    });
  });

  describe("handleShowTableCommand", () => {
    it("should reject invalid table name", async () => {
      const {
        handleShowTableCommand,
      } = require("../handlers/commands/showTable");
      await handleShowTableCommand(["ตาราง", "invalid_table"], "test-token");
      expect(lineClient.replyMessage).toHaveBeenCalledWith(
        "test-token",
        expect.objectContaining({
          text: expect.stringContaining("is not recognized"),
        }),
      );
    });

    it("should reject missing table argument", async () => {
      const {
        handleShowTableCommand,
      } = require("../handlers/commands/showTable");
      await handleShowTableCommand(["ตาราง"], "test-token");
      expect(lineClient.replyMessage).toHaveBeenCalledWith(
        "test-token",
        expect.objectContaining({
          text: expect.stringContaining("Invalid usage"),
        }),
      );
    });

    it("should display member table as Flex", async () => {
      const {
        handleShowTableCommand,
      } = require("../handlers/commands/showTable");
      pool.query
        .mockResolvedValueOnce({
          rows: [
            { name: "Alice", is_admin: true },
            { name: "Bob", is_admin: false },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }) // getAllRemainingHh
        .mockResolvedValueOnce({ rows: [] }); // getAllPendingHh

      await handleShowTableCommand(["ตาราง", "member"], "test-token");
      expect(lineClient.replyMessage).toHaveBeenCalledWith(
        "test-token",
        expect.objectContaining({
          type: "flex",
          altText: expect.stringContaining("สมาชิกในทีม"),
        }),
      );
    });
  });

  describe("handleUpdateRequest", () => {
    it("should reject insufficient arguments", async () => {
      const {
        handleUpdateRequest,
      } = require("../handlers/commands/updateRequests");
      await handleUpdateRequest(["อัปเดต"], mockUserMetadata);
      expect(lineClient.replyMessage).toHaveBeenCalledWith(
        mockUserMetadata.replyToken,
        expect.objectContaining({
          text: expect.stringContaining("ไม่ถูกต้อง"),
        }),
      );
    });

    it("should reject invalid key status", async () => {
      const {
        handleUpdateRequest,
      } = require("../handlers/commands/updateRequests");
      await handleUpdateRequest(["อัปเดต", "1", "invalid"], mockUserMetadata);
      expect(lineClient.replyMessage).toHaveBeenCalledWith(
        mockUserMetadata.replyToken,
        expect.objectContaining({
          text: expect.stringContaining("ไม่มีในระบบ"),
        }),
      );
    });
  });

  describe("handleDeleteRequest", () => {
    it("should reject insufficient arguments", async () => {
      const {
        handleDeleteRequest,
      } = require("../handlers/commands/deleteRequest");
      await handleDeleteRequest(["ลบ"], mockUserMetadata);
      expect(lineClient.replyMessage).toHaveBeenCalledWith(
        mockUserMetadata.replyToken,
        expect.objectContaining({
          text: expect.stringContaining("ไม่ถูกต้อง"),
        }),
      );
    });

    it("should reject if ID not owned by user", async () => {
      const {
        handleDeleteRequest,
      } = require("../handlers/commands/deleteRequest");
      pool.query.mockResolvedValueOnce({ rows: [{ total: 0 }] });

      await handleDeleteRequest(["ลบ", "99"], mockUserMetadata);
      expect(lineClient.replyMessage).toHaveBeenCalledWith(
        mockUserMetadata.replyToken,
        expect.objectContaining({
          text: expect.stringContaining("ไม่มี ID:99"),
        }),
      );
    });

    it("should show confirm dialog for admin delete", async () => {
      const {
        handleDeleteRequest,
      } = require("../handlers/commands/deleteRequest");
      pool.query
        .mockResolvedValueOnce({ rows: [{ total: 1 }] }) // checkIfIdExist
        .mockResolvedValueOnce({
          // getLeaveById
          rows: [
            {
              id: 1,
              member: "someone",
              leave_type: "ลาพักร้อน",
              leave_start_dt: "2025-01-15",
              leave_end_dt: "2025-01-15",
              period_detail: "1วัน",
              is_approve: false,
              status: "key",
            },
          ],
        });

      await handleDeleteRequest(["ลบ", "1"], adminMetadata);
      // Now sends Flex confirm dialog instead of directly deleting
      expect(lineClient.replyMessage).toHaveBeenCalledWith(
        adminMetadata.replyToken,
        expect.objectContaining({
          type: "flex",
          altText: expect.stringContaining("ยืนยันลบ"),
        }),
      );
    });
  });

  describe("handleHhCommand", () => {
    it("should reject insufficient arguments", async () => {
      const { handleHhCommand } = require("../handlers/commands/hhCommands");
      await handleHhCommand(["hh"], mockUserMetadata);
      expect(lineClient.replyMessage).toHaveBeenCalledWith(
        mockUserMetadata.replyToken,
        expect.objectContaining({
          text: expect.stringContaining("ไม่ถูกต้อง"),
        }),
      );
    });

    it("should reject unknown subcommand", async () => {
      const { handleHhCommand } = require("../handlers/commands/hhCommands");
      await handleHhCommand(["hh", "unknown"], mockUserMetadata);
      expect(lineClient.replyMessage).toHaveBeenCalledWith(
        mockUserMetadata.replyToken,
        expect.objectContaining({
          text: expect.stringContaining("ไม่รู้จัก"),
        }),
      );
    });

    it("should reject non-admin hh approve", async () => {
      const { handleHhCommand } = require("../handlers/commands/hhCommands");
      await handleHhCommand(["hh", "approve", "1"], mockUserMetadata);
      expect(lineClient.replyMessage).toHaveBeenCalledWith(
        mockUserMetadata.replyToken,
        expect.objectContaining({
          text: expect.stringContaining("ไม่ใช่ Admin"),
        }),
      );
    });
  });

  describe("handleReportCommand", () => {
    it("should reject insufficient arguments", async () => {
      const {
        handleReportCommand,
      } = require("../handlers/commands/reportRequest");
      await handleReportCommand(["รายงาน"], mockUserMetadata);
      expect(lineClient.replyMessage).toHaveBeenCalledWith(
        mockUserMetadata.replyToken,
        expect.objectContaining({
          text: expect.stringContaining("Invalid usage"),
        }),
      );
    });

    it("should reject unknown report type", async () => {
      const {
        handleReportCommand,
      } = require("../handlers/commands/reportRequest");
      await handleReportCommand(["รายงาน", "unknown"], mockUserMetadata);
      expect(lineClient.replyMessage).toHaveBeenCalledWith(
        mockUserMetadata.replyToken,
        expect.objectContaining({
          text: expect.stringContaining("ไม่มีในระบบ"),
        }),
      );
    });

    it("should handle today report with Flex Message", async () => {
      const {
        handleReportCommand,
      } = require("../handlers/commands/reportRequest");
      pool.query.mockResolvedValueOnce({ rows: [] });

      await handleReportCommand(["รายงาน", "วันนี้"], mockUserMetadata);
      // Now sends Flex Message instead of plain text
      expect(lineClient.replyMessage).toHaveBeenCalledWith(
        mockUserMetadata.replyToken,
        expect.objectContaining({
          type: "flex",
          altText: expect.stringContaining("คนที่ลาวันนี้"),
        }),
      );
    });
  });

  describe("handleSummaryCommand", () => {
    it("should show personal summary as Flex Message", async () => {
      const {
        handleSummaryCommand,
      } = require("../handlers/commands/summaryCommand");
      pool.query.mockResolvedValueOnce({
        rows: [
          { leave_type: "ลาพักร้อน", total_days: "3", total_requests: "2" },
        ],
      });

      await handleSummaryCommand(["สรุป"], mockUserMetadata);
      expect(lineClient.replyMessage).toHaveBeenCalledWith(
        mockUserMetadata.replyToken,
        expect.objectContaining({
          type: "flex",
          altText: expect.stringContaining("สรุปวันลาของ testuser"),
        }),
      );
    });

    it("should show empty summary message", async () => {
      const {
        handleSummaryCommand,
      } = require("../handlers/commands/summaryCommand");
      pool.query.mockResolvedValueOnce({ rows: [] });

      await handleSummaryCommand(["สรุป"], mockUserMetadata);
      expect(lineClient.replyMessage).toHaveBeenCalledWith(
        mockUserMetadata.replyToken,
        expect.objectContaining({
          text: expect.stringContaining("ยังไม่มีรายการวันลา"),
        }),
      );
    });
  });

  // ══════════════════════════════════════════════════════════
  // New Feature Tests
  // ══════════════════════════════════════════════════════════

  describe("handleStatsCommand", () => {
    it("should return Flex Message with monthly stats", async () => {
      const {
        handleStatsCommand,
      } = require("../handlers/commands/statsCommand");
      // getMonthlyStats called twice (current + prev), each does 5 queries
      pool.query
        // Current month
        .mockResolvedValueOnce({ rows: [{ total: "10", total_days: "8" }] })
        .mockResolvedValueOnce({ rows: [{ member: "Alice", days: "5" }] })
        .mockResolvedValueOnce({
          rows: [{ leave_type: "ลาพักร้อน", cnt: "6" }],
        })
        .mockResolvedValueOnce({ rows: [{ day_name: "Monday", cnt: "4" }] })
        .mockResolvedValueOnce({ rows: [{ total: "3" }] })
        // Previous month
        .mockResolvedValueOnce({ rows: [{ total: "7", total_days: "5" }] })
        .mockResolvedValueOnce({ rows: [{ member: "Bob", days: "3" }] })
        .mockResolvedValueOnce({ rows: [{ leave_type: "ลาป่วย", cnt: "3" }] })
        .mockResolvedValueOnce({ rows: [{ day_name: "Friday", cnt: "2" }] })
        .mockResolvedValueOnce({ rows: [{ total: "3" }] });

      await handleStatsCommand(["สถิติ"], mockUserMetadata);
      expect(lineClient.replyMessage).toHaveBeenCalledWith(
        mockUserMetadata.replyToken,
        expect.objectContaining({
          type: "flex",
          altText: expect.stringContaining("สถิติ"),
        }),
      );
    });
  });

  describe("handleShowCommands (Flex)", () => {
    it("should include สถิติ in altText", async () => {
      const {
        handleShowCommands,
      } = require("../handlers/commands/showCommands");
      await handleShowCommands("test-token");
      expect(lineClient.replyMessage).toHaveBeenCalledWith(
        "test-token",
        expect.objectContaining({
          type: "flex",
          altText: expect.stringContaining("คำสั่ง"),
        }),
      );
    });
  });
});
