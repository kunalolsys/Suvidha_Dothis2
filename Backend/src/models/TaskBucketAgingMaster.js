import mongoose from "mongoose";

const TaskBucketAgingMasterSchema = new mongoose.Schema(
  {
    pendingDaysThreshold: {
      type: Number,
      required: true,
      min: 0,
      default: 2,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model(
  "TaskBucketAgingMaster",
  TaskBucketAgingMasterSchema,
);
