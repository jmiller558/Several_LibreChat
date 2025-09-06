const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  try {
    const MONGO_URI = 'mongodb+srv://praneeth:s7XJ2hwfZhggIwQz@librechat.v7jxcfg.mongodb.net/LibreChat';
    
    console.log('🔌 Testing MongoDB Atlas connection...');
    console.log('URI:', MONGO_URI.replace(/:[^:@]*@/, ':***@')); // Hide password
    
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Connected to MongoDB Atlas successfully!');
    
    // List databases
    const admin = mongoose.connection.db.admin();
    const result = await admin.listDatabases();
    console.log('📊 Available databases:', result.databases.map(db => db.name));
    
    // List collections in LibreChat database
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 Collections in LibreChat:', collections.map(col => col.name));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
    process.exit(1);
  }
}

testConnection();
