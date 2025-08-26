require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const passport = require("passport");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === "production";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per window
  standardHeaders: true,
  legacyHeaders: false,
});

// Passport Config
require("./config/passport")(passport);

// DB Config - Remove deprecated options
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected..."))
  .catch((err) => console.log(err));

// Middlewares
const clientURL = isProduction
  ? process.env.CLIENT_ORIGIN_URL
  : "http://localhost:5173";


app.use(
  cors({
    origin: clientURL,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy only in production
if (isProduction) {
    app.set('trust proxy', 1); 
}

// Passport Middleware
app.use(passport.initialize());

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/videos", require("./routes/videos"));
app.use("/api/users", require("./routes/users"));

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
