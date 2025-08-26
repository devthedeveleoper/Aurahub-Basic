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
const isProduction = process.env.NODE_ENV === "production";

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
app.use(cookieParser());

// Trust proxy only in production
if (isProduction) {
    app.set('trust proxy', 1); 
}

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions'
    }),
    // --- UPDATED COOKIE CONFIGURATION ---
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,
        // Use settings based on the environment
        secure: isProduction,               // true in production, false in development
        sameSite: isProduction ? 'none' : 'lax', // 'none' for cross-site prod, 'lax' for same-site dev
        domain: isProduction ? '.onrender.com' : undefined
    }
}));

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/videos", require("./routes/videos"));

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
