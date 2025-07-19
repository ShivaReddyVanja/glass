const MongooseRepository = require('../mongooseRepository');
const { User } = require('./../../../../../mongodb_models');

class UserMongooseRepository extends MongooseRepository {
    constructor() {
        super(User);
    }

    async findOrCreate(userData) {
        try {
            // Check if user already exists
            let user = await this.model.findOne({ uid: userData.uid });
            
            if (user) {
                // Update existing user
                user = await this.model.findOneAndUpdate(
                    { uid: userData.uid },
                    { 
                        ...userData,
                        updatedAt: new Date()
                    },
                    { new: true }
                );
                console.log(`[UserMongooseRepository] Updated existing user: ${userData.uid}`);
            } else {
                // Create new user
                user = new this.model({
                    ...userData,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                await user.save();
                console.log(`[UserMongooseRepository] Created new user: ${userData.uid}`);
            }
            
            return this.convertId(user.toObject());
        } catch (error) {
            console.error('[UserMongooseRepository] Error in findOrCreate:', error);
            throw error;
        }
    }

    async getById(uid) {
        return this.findByUid(uid);
    }

    async update(updateData) {
        try {
            const result = await this.model.findOneAndUpdate(
                { uid: updateData.uid },
                { 
                    ...updateData,
                    updatedAt: new Date()
                },
                { new: true }
            );
            return result ? this.convertId(result.toObject()) : null;
        } catch (error) {
            console.error('[UserMongooseRepository] Error updating user:', error);
            throw error;
        }
    }

    async deleteById(uid) {
        try {
            const result = await this.model.findOneAndDelete({ uid });
            return !!result;
        } catch (error) {
            console.error('[UserMongooseRepository] Error deleting user:', error);
            throw error;
        }
    }

    async setMigrationComplete(uid) {
        try {
            await this.model.findOneAndUpdate(
                { uid },
                { 
                    has_migrated_to_mongo: true,
                    updatedAt: new Date()
                }
            );
            console.log(`[UserMongooseRepository] Marked migration complete for user: ${uid}`);
        } catch (error) {
            console.error('[UserMongooseRepository] Error setting migration complete:', error);
            throw error;
        }
    }
}

module.exports = new UserMongooseRepository(); 