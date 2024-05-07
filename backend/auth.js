const express = require("express");

const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./models/User.model");
const Token = require("./models/Token.model");
const { roleCheck } = require("./middlewares/roleCheck");

require("dotenv").config();

const ROOT_USER = process.env.ROOT_USER;
const ROOT_PSD = process.env.ROOT_PSD;
const JWT_SECRET = process.env.JWT_SECRET;
const RT_SECRET = process.env.RT_SECRET;

router.post("/register", roleCheck(["Supervisor", "Root"]), async (req, res) => {
  const { username, password, role, fullname, email } = req.body;

  try {
    if (role === "Root") {
      res.locals.message = "Invalid role";
      return res.status(400).json({ message: res.locals.message });
    }

    if (req.user.role === "Supervisor" && role === "Supervisor") {
      res.locals.message = "Cannot Create user with Supervisor role, only Root can do that";
      return res.status(400).json({ message: res.locals.message });
    }

    let user = await User.findOne({ username: username });
    if (user) {
      res.locals.message = "User already exists";
      return res.status(400).json({ message: res.locals.message });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user = new User({
      username: username,
      password: hashedPassword,
      role: role,
      fullname: fullname,
      email: email,
    });

    await user.save();
    res.locals.message = "User created successfully";

    res.status(201).json({ user, message: res.locals.message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    let user = await User.findOne({ username: username }).select("+password").exec();
    if (!user) {
      res.locals.message = "User does not exist";
      return res.status(404).json({ message: res.locals.message });
    }
    if (!user.isActive) {
      res.locals.message = "Your account is inactive. Please contact support for more information.";
      return res.status(401).json({ message: res.locals.message });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.locals.message = "Invalid credentials";
      return res.status(400).json({ message: res.locals.message });
    }

    req.user = {
      id: user._id,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
    };

    const refreshToken = jwt.sign({ id: user._id }, RT_SECRET, { expiresIn: "1w" });

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        username: user.username,
        isActive: user.isActive,
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const expired_at = new Date();
    expired_at.setDate(expired_at.getDate() + 7);

    const tokenData = new Token({
      username: user.username,
      token: refreshToken,
      expired_at,
    });
    await tokenData.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, //7 days
    });

    res.locals.message = "Access granted";
    res.json({ token, message: res.locals.message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = req.cookies["refreshToken"];

    const payload = jwt.verify(refreshToken, RT_SECRET);
    if (!payload) {
      res.locals.message = "unauthenticated";
      return res.status(401).json({ message: res.locals.message });
    }

    const user = await User.findById(payload.id);
    if (!user) {
      res.locals.message = "unauthenticated";
      return res.status(401).json({ message: res.locals.message });
    }

    const dbToken = await Token.findOne({
      username: user.username,
      token: refreshToken,
      expired_at: { $gte: new Date() },
    });

    if (!dbToken) {
      res.locals.message = "unauthenticated";
      return res.status(401).json({ message: res.locals.message });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        username: user.username,
        isActive: user.isActive,
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.locals.message = "success";
    res.send({ token, message: res.locals.message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/user", async (req, res) => {
  try {
    const token = req.header("Authorization").split(" ")[1] || "";

    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload) {
      res.locals.message = "unauthenticated";
      return res.status(401).json({ message: res.locals.message });
    }

    const user = await User.findOne(payload.id);
    if (!user) {
      res.locals.message = "unauthenticated";
      return res.status(401).json({ message: res.locals.message });
    }

    req.user = {
      id: user._id,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
    };

    res.locals.message = "Access granted";

    res.send(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/logout", async (req, res) => {
  try {
    const refreshToken = req.cookies["refreshToken"];
    await Token.delete({ token: refreshToken });
    res.cookie("refreshToken", "", { httpOnly: true, secure: true, maxAge: 0 });

    res.locals.message = "logout success";
    res.json({ message: res.locals.message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Root and Users setup functions
async function setupRootUser() {
  try {
    const rootExists = await User.findOne({ role: "Root" });
    if (!rootExists) {
      let hashedPassword = await bcrypt.hash(ROOT_PSD, 10);
      const rootUser = new User({
        username: ROOT_USER,
        password: hashedPassword,
        role: "Root",
      });
      await rootUser.save();
      console.log("Root user created successfully.");
    } else {
      console.log(`Root user already exists.`);
    }
  } catch (error) {
    console.error("Error setting up root user:", error);
  }
}

async function setupUsers() {
  const users = [
    { username: "Viewer", role: "Viewer" },
    { username: "Auditor", role: "Auditor" },
    { username: "Supervisor", role: "Supervisor" },
  ];
  try {
    for (const { username, role } of users) {
      const userExists = await User.findOne({ username });
      if (!userExists) {
        let hashedPassword = await bcrypt.hash(username, 10);
        const user = new User({
          username,
          password: hashedPassword,
          role,
        });
        await user.save();
        console.log(`User ${username} created successfully.`);
      } else {
        console.log(`User ${username} already exists.`);
      }
    }
  } catch (error) {
    console.error("Error setting up users:", error);
  }
}

// Call the root and users setup function
setupRootUser().then(() => console.log("Root setup complete"));
setupUsers().then(() => console.log("Users setup complete"));

module.exports = router;
