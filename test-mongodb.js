require('dotenv').config();
const mongoose = require('mongoose');

async function testMongoDBConnection() {
    console.log('🔍 Testing MongoDB Atlas Connection...');
    console.log('Environment check:');
    console.log('- MONGODB_URI exists:', !!process.env.MONGODB_URI);
    console.log('- URI starts with mongodb+srv:', process.env.MONGODB_URI?.startsWith('mongodb+srv'));
    
    if (!process.env.MONGODB_URI) {
        console.error('❌ MONGODB_URI not found in .env file');
        return;
    }
    
    try {
        console.log('\n🔄 Attempting to connect...');
        await mongoose.connect(process.env.MONGODB_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        
        console.log('✅ Successfully connected to MongoDB Atlas!');
        
        // Test basic operations
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        console.log('📋 Available collections:', collections.map(c => c.name));
        
        // Test a simple operation
        const testCollection = db.collection('test_connection');
        await testCollection.insertOne({ test: true, timestamp: new Date() });
        console.log('✅ Write test successful');
        
        const result = await testCollection.findOne({ test: true });
        console.log('✅ Read test successful');
        
        // Clean up
        await testCollection.deleteOne({ test: true });
        console.log('✅ Cleanup successful');
        
        await mongoose.connection.close();
        console.log('✅ Connection closed successfully');
        
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        
        if (error.message.includes('whitelist')) {
            console.log('\n💡 IP Whitelist Solution:');
            console.log('1. Go to MongoDB Atlas → Network Access');
            console.log('2. Click "Add IP Address"');
            console.log('3. Add: 0.0.0.0/0 (allow all IPs)');
            console.log('4. Click "Confirm"');
        }
        
        if (error.message.includes('authentication')) {
            console.log('\n💡 Authentication Solution:');
            console.log('1. Check your username/password in the connection string');
            console.log('2. Go to MongoDB Atlas → Database Access');
            console.log('3. Make sure your user has proper permissions');
        }
    }
}

testMongoDBConnection(); 