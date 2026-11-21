import TaskBucket from "../models/TaskBucket.js";
import TaskBucketAgingMaster from "../models/TaskBucketAgingMaster.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { handleAsync } from "../utils/handleAsync.js";
import moment from "moment-timezone";

// Helper: Calculate strict greater-than cutoff date from Master Days (Asia/Kolkata)
const getAgingCutoffConfig = async () => {
  const master = await TaskBucketAgingMaster.findOne().lean();
  const days = Number(master?.pendingDaysThreshold ?? 2);

  // Example: Agar aaj 21 Nov hai aur master days = 2 hai,
  // to startOf("day") - 2 days = 19 Nov 00:00:00 IST.
  // createdAt < 19 Nov 00:00:00 ka matlab: 18 Nov ya usse pehle ki buckets (> 2 days old).
  const cutoffDate = moment()
    .tz("Asia/Kolkata")
    .startOf("day")
    .subtract(days, "days")
    .toDate();

  return { days, cutoffDate };
};

// =========================================================================
// 1. MASTER GET & UPSERT API (SET / GET DAYS THRESHOLD)
// =========================================================================
export const getTaskBucketAgingMaster = handleAsync(async (req, res) => {
  let master = await TaskBucketAgingMaster.findOne().lean();

  if (!master) {
    master = await TaskBucketAgingMaster.create({ pendingDaysThreshold: 2 });
  }

  return res.status(200).json({
    success: true,
    data: {
      _id: master._id,
      pendingDaysThreshold: master.pendingDaysThreshold,
      updatedAt: master.updatedAt,
    },
  });
});

export const upsertTaskBucketAgingMaster = handleAsync(
  async (req, res, next) => {
    const { pendingDaysThreshold } = req.body;
    const days = Number(pendingDaysThreshold);

    if (
      pendingDaysThreshold === undefined ||
      pendingDaysThreshold === null ||
      Number.isNaN(days) ||
      days < 0
    ) {
      return next(
        new AppError(
          "pendingDaysThreshold must be a valid non-negative number",
          400,
        ),
      );
    }

    const userId = req.cookies?.userId || req.user?._id || null;

    const master = await TaskBucketAgingMaster.findOneAndUpdate(
      {},
      {
        $set: {
          pendingDaysThreshold: days,
          updatedBy: userId,
        },
      },
      { new: true, upsert: true },
    ).lean();

    return res.status(200).json({
      success: true,
      message: `Master updated: showing undistributed buckets pending for more than ${days} day(s)`,
      data: {
        _id: master._id,
        pendingDaysThreshold: master.pendingDaysThreshold,
        updatedAt: master.updatedAt,
      },
    });
  },
);

// =========================================================================
// 2. API 1: USER-WISE PENDING UNDISTRIBUTED AGING BUCKET COUNTS (> MASTER DAYS)
// =========================================================================
export const getEmployeeWiseAgingBucketCounts = handleAsync(
  async (req, res) => {
    const { cutoffDate } = await getAgingCutoffConfig();

    const [activeUsers, agingBuckets] = await Promise.all([
      User.find({ isDeleted: { $ne: true } })
        .select("_id name email employeeCode role")
        .lean(),

      // Sirf woh buckets jo abhi tak distribute nahi hui hain aur > master days purani hain
      TaskBucket.find({
        isDeleted: { $ne: true },
        status: { $ne: "Completed" },
        distributionStatus: "Pending",
        $or: [
          { generatedTasks: { $exists: false } },
          { generatedTasks: { $size: 0 } },
        ],
        createdAt: { $lt: cutoffDate },
      })
        .select(
          "_id assignmentMode targetRole targetUsers assignedTargetUsers targetUserDistribution",
        )
        .lean(),
    ]);

    const userMap = new Map();
    const usersByRole = new Map();
    const userBucketSets = new Map();

    for (const u of activeUsers) {
      const uid = String(u._id);
      userMap.set(uid, u);

      if (u.role) {
        const roleId = String(u.role._id || u.role);
        if (!usersByRole.has(roleId)) usersByRole.set(roleId, []);
        usersByRole.get(roleId).push(u);
      }
    }

    const addBucketForUser = (userId, bucketId) => {
      const uid = String(userId);
      if (!userMap.has(uid)) return;
      if (!userBucketSets.has(uid)) {
        userBucketSets.set(uid, new Set());
      }
      userBucketSets.get(uid).add(String(bucketId));
    };

    for (const bucket of agingBuckets) {
      const bid = String(bucket._id);

      const directUsers = [
        ...(bucket.targetUsers || []),
        ...(bucket.assignedTargetUsers || []),
      ];
      for (const uid of directUsers) {
        addBucketForUser(uid, bid);
      }

      if (Array.isArray(bucket.targetUserDistribution)) {
        for (const dist of bucket.targetUserDistribution) {
          if (dist?.user && dist.status === "Pending") {
            addBucketForUser(dist.user, bid);
          }
        }
      }

      if (bucket.assignmentMode === "Role" && bucket.targetRole) {
        const roleId = String(bucket.targetRole._id || bucket.targetRole);
        const matchedRoleUsers = usersByRole.get(roleId) || [];
        for (const u of matchedRoleUsers) {
          addBucketForUser(u._id, bid);
        }
      }
    }

    // Sirf wahi users bhejein jinka pendingCount > 0 hai
    const usersList = [];
    for (const [uid, bucketSet] of userBucketSets.entries()) {
      const u = userMap.get(uid);
      if (u && bucketSet.size > 0) {
        usersList.push({
          employeeCode: u.employeeCode || "-",
          name: u.name,
          email: u.email,
          pendingCount: bucketSet.size,
        });
      }
    }

    usersList.sort((a, b) => b.pendingCount - a.pendingCount);

    return res.status(200).json({
      success: true,
      users: usersList,
    });
  },
);

// =========================================================================
// 3. API 2: SPECIFIC EMPLOYEE UNDISTRIBUTED AGING BUCKET LIST (> MASTER DAYS)
// =========================================================================
export const getEmployeeAgingBucketList = handleAsync(
  async (req, res, next) => {
    const employeeCode =
      req.params.employeeCode || req.query.employeeCode || "";

    if (!String(employeeCode).trim()) {
      return next(new AppError("employeeCode is required", 400));
    }

    const escapedCode = String(employeeCode)
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const user = await User.findOne({
      employeeCode: { $regex: `^${escapedCode}$`, $options: "i" },
      isDeleted: { $ne: true },
    })
      .select("_id name email employeeCode role")
      .lean();

    if (!user) {
      return next(
        new AppError(`Employee with code "${employeeCode}" not found`, 404),
      );
    }

    const { days, cutoffDate } = await getAgingCutoffConfig();

    const userConditions = [
      { targetUsers: user._id },
      { assignedTargetUsers: user._id },
      {
        targetUserDistribution: {
          $elemMatch: { user: user._id, status: "Pending" },
        },
      },
    ];

    if (user.role) {
      userConditions.push({
        assignmentMode: "Role",
        targetRole: user.role._id || user.role,
      });
    }

    const buckets = await TaskBucket.find({
      isDeleted: { $ne: true },
      status: { $ne: "Completed" },
      distributionStatus: "Pending",
      createdAt: { $lt: cutoffDate },
      $and: [
        {
          $or: [
            { generatedTasks: { $exists: false } },
            { generatedTasks: { $size: 0 } },
          ],
        },
        { $or: userConditions },
      ],
    })
      .select(
        "bucketId title description status distributionStatus startDate taskEndDays isRecurrent frequency createdAt",
      )
      .sort({ createdAt: 1 })
      .lean();

    const nowMoment = moment().tz("Asia/Kolkata");

    const formattedList = buckets.map((b) => ({
      _id: b._id,
      bucketId: b.bucketId,
      title: b.title,
      description: b.description,
      status: b.status,
      distributionStatus: b.distributionStatus,
      startDate: b.startDate,
      taskEndDays: b.taskEndDays,
      isRecurrent: b.isRecurrent,
      frequency: b.frequency,
      createdAt: b.createdAt,
      pendingSinceDays: nowMoment.diff(
        moment(b.createdAt).tz("Asia/Kolkata"),
        "days",
      ),
    }));

    return res.status(200).json({
      success: true,
      masterDaysThreshold: days,
      employee: {
        employeeCode: user.employeeCode,
        name: user.name,
        email: user.email,
      },
      count: formattedList.length,
      data: formattedList,
    });
  },
);
