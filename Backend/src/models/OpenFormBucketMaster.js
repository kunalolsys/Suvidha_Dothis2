import mongoose from "mongoose";

const OpenFormBucketMasterSchema = new mongoose.Schema(
  {
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    taskEndDays: {
      type: Number,
      required: true,
      min: 1,
      default: 3,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.model(
  "OpenFormBucketMaster",
  OpenFormBucketMasterSchema,
);
