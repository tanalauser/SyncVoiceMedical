const mongoose = require('mongoose');
const path = require('path');

// Add connection state monitoring
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected successfully');
  console.log('📊 Database:', mongoose.connection.name);
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
  console.error('Error details:', {
    message: err.message,
    code: err.code,
    name: err.name
  });
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('connecting', () => {
  console.log('🔄 Connecting to MongoDB...');
});

const connectDB = async () => {
  try {
    console.log('Starting MongoDB connection process...');
    
    // Check for MONGODB_URI first (highest priority)
    let connectionString;
    
    if (process.env.MONGODB_URI) {
      console.log('✅ Using MONGODB_URI from environment');
      connectionString = process.env.MONGODB_URI;
    } else if (process.env.APP_DB_CONNECTION_STRING) {
      console.log('✅ Using APP_DB_CONNECTION_STRING from environment');
      connectionString = process.env.APP_DB_CONNECTION_STRING;
    } else {
      console.log('⚠️  No direct connection string found, building from parts...');
      
      // MongoDB Atlas connection details
      const username = encodeURIComponent(process.env.APP_DB_USER);
      const password = encodeURIComponent(process.env.APP_DB_PASS);
      const instance = process.env.APP_DB_INSTANCE;
      
      // Check if required variables exist
      if (!username || !password || !instance) {
        throw new Error('Missing required MongoDB environment variables: APP_DB_USER, APP_DB_PASS, or APP_DB_INSTANCE');
      }
      
      // Build the MongoDB Atlas connection string
      // Note: This uses SRV format which may not work in containerized environments
      connectionString = `mongodb+srv://${username}:${password}@${instance}/?retryWrites=true&w=majority&appName=SyncVoiceMedical`;
      console.log('⚠️  Warning: Using SRV connection format which may fail in containers');
    }
    
    // Log sanitized connection string
    const sanitized = connectionString.replace(/:([^@]+)@/, ':****@');
    console.log('Connection string:', sanitized);
    console.log('Connection format:', connectionString.startsWith('mongodb+srv://') ? 'SRV' : 'Standard');
    
    // Modern connection options (removed deprecated options)
    const options = {
      serverSelectionTimeoutMS: 30000, // 30 seconds for serverless cold starts
      socketTimeoutMS: 45000, // 45 seconds socket timeout
      maxPoolSize: 10,
      minPoolSize: 1,
      // Don't use deprecated options like useNewUrlParser or useUnifiedTopology
    };
    
    console.log('Connection options:', {
      serverSelectionTimeoutMS: options.serverSelectionTimeoutMS,
      socketTimeoutMS: options.socketTimeoutMS,
      maxPoolSize: options.maxPoolSize
    });
    
    // Set mongoose-level configurations
    mongoose.set('bufferTimeoutMS', 30000); // 30 seconds buffer timeout
    mongoose.set('bufferCommands', false); // Disable buffering
    
    // Connect to MongoDB
    console.log('Attempting connection...');
    const conn = await mongoose.connect(connectionString, options);
    
    console.log(`✅ MongoDB Connected to: ${conn.connection.host}`);
    console.log(`📊 Database name: ${conn.connection.name}`);
    
    return conn;
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB:`, error.message);
    console.error('Error details:', {
      name: error.name,
      code: error.code,
      codeName: error.codeName
    });
    
    if (error.message.includes('querySrv ENOTFOUND')) {
      console.error('\n🔍 DNS Resolution Issue Detected:');
      console.error('This is common in containerized environments like Scaleway.');
      console.error('\nSolution: Use a standard mongodb:// connection string instead of mongodb+srv://');
      console.error('Set MONGODB_URI environment variable with the standard format:');
      console.error('mongodb://username:password@host1:27017,host2:27017,host3:27017/?retryWrites=true&w=majority');
      
      // Don't attempt direct connection if we already have MONGODB_URI
      if (!process.env.MONGODB_URI) {
        console.log('\n🔄 Attempting alternative connection...');
        return attemptDirectConnection();
      }
    }
    
    if (error.message.includes('bad auth') || error.message.includes('authentication failed')) {
      console.error('\n🔍 Authentication Issue:');
      console.error('1. Verify username and password are correct');
      console.error('2. Check if password needs URL encoding for special characters');
      console.error('3. Ensure user exists in MongoDB Atlas with correct permissions');
      console.error('4. Try creating a new user with a simple password for testing');
    }
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
      console.error('\n🔍 Network Access Issue:');
      console.error('1. Go to MongoDB Atlas → Network Access');
      console.error('2. Add 0.0.0.0/0 to allow access from anywhere');
      console.error('3. Or add Scaleway IP ranges');
    }
    
    // Don't exit in production - let the container handle retries
    if (process.env.NODE_ENV === 'production') {
      console.error('⏳ Will retry connection in 10 seconds...');
      setTimeout(connectDB, 10000);
    } else {
      process.exit(1);
    }
  }
};

// Alternative connection method for DNS issues
async function attemptDirectConnection() {
  try {
    console.log('🔄 Attempting to convert SRV to standard format...');
    
    const username = encodeURIComponent(process.env.APP_DB_USER);
    const password = encodeURIComponent(process.env.APP_DB_PASS);
    const instance = process.env.APP_DB_INSTANCE;
    
    // For MongoDB Atlas, convert cluster name to shard addresses
    // This is a fallback - it's better to set MONGODB_URI directly
    if (instance && instance.includes('.mongodb.net')) {
      const clusterName = instance.split('.')[0];
      const baseDomain = instance.substring(instance.indexOf('.') + 1);
      
      // MongoDB Atlas typically uses this pattern
      const directConnectionString = `mongodb://${username}:${password}@${clusterName}-shard-00-00.${baseDomain}:27017,${clusterName}-shard-00-01.${baseDomain}:27017,${clusterName}-shard-00-02.${baseDomain}:27017/?ssl=true&retryWrites=true&w=majority&authSource=admin`;
      
      console.log('Converted connection string:', directConnectionString.replace(password, '****'));
      
      const conn = await mongoose.connect(directConnectionString, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000
      });
      
      console.log('✅ Connected via converted connection string');
      return conn;
    } else {
      throw new Error('Cannot convert connection string - please set MONGODB_URI environment variable');
    }
  } catch (directError) {
    console.error('❌ Alternative connection also failed:', directError.message);
    console.error('\n📌 SOLUTION: Set MONGODB_URI environment variable with your connection string');
    console.error('Example: mongodb://username:password@host1:27017,host2:27017,host3:27017/?retryWrites=true&w=majority');
    
    if (process.env.NODE_ENV === 'production') {
      console.error('⏳ Will retry connection in 10 seconds...');
      setTimeout(connectDB, 10000);
    } else {
      process.exit(1);
    }
  }
}

module.exports = connectDB;