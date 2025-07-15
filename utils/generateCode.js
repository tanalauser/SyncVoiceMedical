/**
 * Generates a random activation code for user registration
 * This function is used in userRoutes.js for creating activation codes
 * @returns {string} A randomly generated uppercase alphanumeric code
 */
function generateActivationCode() {
    // Generate a random string and convert to uppercase
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }
  
  // Export the function directly as the module
  module.exports = generateActivationCode;