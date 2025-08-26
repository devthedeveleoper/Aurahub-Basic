require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const passport = require("passport");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const MongoStore = require("connect-mongo"); // <-- 1. IMPORT connect-mongo

const app = express();
const PORT = process.env.PORT || 5000;

// Passport Config
require("./config/passport")(passport);

// DB Config - Remove deprecated options
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected..."))
  .catch((err) => console.log(err));

// Middlewares
const clientURL =
  process.env.NODE_ENV === "production"
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
app.use(cookieParser());

// --- UPDATED SESSION CONFIGURATION ---
// This tells Express to trust the proxy that Render uses
app.set("trust proxy", 1);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    // 2. CONFIGURE THE STORE to save sessions in MongoDB
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions", // Optional: name of the collection
    }),
    // 3. CONFIGURE THE COOKIE for production
    cookie: {
      secure: process.env.NODE_ENV === "production", // Send cookie only over HTTPS in production
      httpOnly: true, // Prevent client-side JS from accessing the cookie
      sameSite: "none", // Required for cross-site cookies (Cloudflare -> Render)
      maxAge: 1000 * 60 * 60 * 24 * 7, // Cookie expires in 7 days
    },
  })
);
// --- END OF UPDATED SESSION CONFIGURATION ---

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/videos", require("./routes/videos"));

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
