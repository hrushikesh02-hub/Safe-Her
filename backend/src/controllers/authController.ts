import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { AuthRequest } from "../middleware/authMiddleware";

export const registerUser = async (
    
  req: Request,
  res: Response
)
: Promise<void> => {
    const { name, email, phone, password, role } = req.body;
    if (!name || !email || !phone || !password) {
  res.status(400).json({
    success: false,
    message: "All fields are required",
  });

  return;
}
const existingUser = await User.findOne({
  $or: [
    { email },
    { phone }
  ]
});

if (existingUser) {
  res.status(400).json({
    success: false,
    message: "User already exists",
  });

  return;
}
const hashedPassword = await bcrypt.hash(password, 10);
const newUser = await User.create({
  name,
  email,
  phone,
  password: hashedPassword,
  role,
});
res.status(201).json({
  success: true,
  message: "User registered successfully",
  data: {
    id: newUser._id,
    name: newUser.name,
    email: newUser.email,
    phone: newUser.phone,
    role: newUser.role,
  },
});
};

export const loginUser = async (
  req: Request,
  res: Response
): Promise<void> => {

  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({
      success: false,
      message: "Email and password are required",
    });

    return;
  }
  const user = await User.findOne({ email });
  console.log("EMAIL:", email);
console.log("USER FOUND:", user);

if (!user) {
  res.status(401).json({
    success: false,
    message: "Invalid email or password",
  });

  return;
}
const isPasswordMatch = await bcrypt.compare(
  password,
  user.password
);
console.log("PASSWORD:", password);
console.log("HASH:", user.password);
console.log("MATCH:", isPasswordMatch);

if (!isPasswordMatch) {
  res.status(401).json({
    success: false,
    message: "Invalid email or password",
  });

  return;
}

if (user.isBlocked) {
  console.log("USER IS BLOCKED");
  res.status(403).json({
    success: false,
    message: "Your account has been suspended by the admin.",
  });
  return;
}

const token = jwt.sign(
  {
    id: user._id,
    role: user.role,
  },
  process.env.JWT_SECRET as string,
  {
    expiresIn: "7d",
  }
);
res.status(200).json({
  success: true,
  message: "Login successful",
  token,
  data: {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  },
});
};



export const getProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.user?.id).select("-password");

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};