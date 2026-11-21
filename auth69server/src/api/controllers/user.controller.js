import {
  getUserProfileService,
  loginUserService,
  registerUserService,
} from "../services/user.service.js";

export const registerUser = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const result = await registerUserService({ email, password, name });

    return res.status(201).json({
      _id: result._id,
      id: result.id,
      email: result.email,
      token: result.token,
      message: "User registered successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error registering user",
      error: error.message,
    });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await loginUserService({ email, password });
    return res.status(200).json(result);
  } catch (error) {
    const status = error.message.includes("Invalid") || error.message.includes("not exist") ? 401 : 500;
    return res.status(status).json({
      message: "Error logging in",
      error: error.message,
    });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const profile = await getUserProfileService(userId);

    if (!profile) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(profile.user);
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching user profile",
      error: error.message,
    });
  }
};
