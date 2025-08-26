const passport = require("passport");

module.exports = {
  ensureAuthenticated: passport.authenticate("jwt", { session: false }),
};
