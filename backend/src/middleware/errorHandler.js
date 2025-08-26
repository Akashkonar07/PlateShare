// middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  console.error(err.stack);
  res.status(500).json({ message: err.message || "Internal Server Error" });
}

module.exports = { errorHandler }; // ✅ export as object with property
