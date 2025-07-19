const mongoose = require('mongoose');

let isConnected = false;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pickleglass';

async function initializeMongoDB() {
    try {
        if (isConnected) {
            console.log('[MongoClient] Already connected to MongoDB');
            return;
        }

        console.log('[MongoClient] Initializing MongoDB connection...');
        console.log('[MongoClient] Connection URI:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials in logs
        
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        isConnected = true;
        console.log(`[MongoClient] ✅ Successfully connected to MongoDB Atlas`);
        
        // Test the connection
        await mongoose.connection.db.admin().ping();
        console.log('[MongoClient] ✅ Database ping successful');
        
    } catch (error) {
        console.error('[MongoClient] ❌ Failed to initialize MongoDB:', error.message);
        
        // Provide specific guidance for common Atlas issues
        if (error.message.includes('whitelist')) {
            console.error('[MongoClient] 💡 IP Whitelist Issue:');
            console.error('   - Go to MongoDB Atlas → Network Access');
            console.error('   - Add your current IP or use 0.0.0.0/0 for all IPs');
            console.error('   - Make sure to click "Confirm" after adding');
        }
        
        if (error.message.includes('authentication')) {
            console.error('[MongoClient] 💡 Authentication Issue:');
            console.error('   - Check your MONGODB_URI in .env file');
            console.error('   - Verify username/password in the connection string');
            console.error('   - Make sure the user has proper permissions in Atlas');
        }
        
        throw error;
    }
}

function getMongoDB() {
    if (!isConnected) {
        throw new Error("MongoDB has not been initialized. Call initializeMongoDB() first.");
    }
    return mongoose.connection.db;
}

function getMongooseConnection() {
    if (!isConnected) {
        throw new Error("MongoDB has not been initialized. Call initializeMongoDB() first.");
    }
    return mongoose.connection;
}

async function closeMongoDB() {
    if (isConnected) {
        await mongoose.connection.close();
        isConnected = false;
        console.log('[MongoClient] ✅ MongoDB connection closed');
    }
}

module.exports = {
    initializeMongoDB,
    getMongoDB,
    getMongooseConnection,
    closeMongoDB
}; 