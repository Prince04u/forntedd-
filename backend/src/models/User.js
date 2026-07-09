const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    inviteCode: {
      type: String,
      unique: true,
      required: true,
      uppercase: true,
      trim: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
    uid: {
      type: Number,
      unique: true,
      sparse: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Encrypt password and auto-assign UID before saving
UserSchema.pre("save", async function (next) {
  if (this.isNew && !this.uid) {
    try {
      const lastUser = await this.constructor.findOne({}, { uid: 1 }).sort({ uid: -1 });
      if (lastUser && lastUser.uid) {
        this.uid = lastUser.uid + 1;
      } else {
        this.uid = 509201;
      }
    } catch (err) {
      return next(err);
    }
  }

  if (!this.isModified("password")) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);
