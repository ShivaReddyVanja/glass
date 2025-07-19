const MongooseRepository = require('../mongooseRepository');
const { Session } = require('./../../../../../mongodb_models');

class SessionMongooseRepository extends MongooseRepository {
    constructor() {
        super(Session);
    }

    async findByUserId(userId) {
        try {
            const sessions = await this.model.find({ userId }).sort({ createdAt: -1 });
            return this.convertIds(sessions.map(doc => doc.toObject()));
        } catch (error) {
            console.error('[SessionMongooseRepository] Error finding sessions by userId:', error);
            throw error;
        }
    }

    async findByUserIdAndType(userId, sessionType) {
        try {
            const sessions = await this.model.find({ 
                userId, 
                session_type: sessionType 
            }).sort({ createdAt: -1 });
            return this.convertIds(sessions.map(doc => doc.toObject()));
        } catch (error) {
            console.error('[SessionMongooseRepository] Error finding sessions by userId and type:', error);
            throw error;
        }
    }

    async createSession(sessionData) {
        try {
            const session = new this.model({
                ...sessionData,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            const savedSession = await session.save();
            return this.convertId(savedSession.toObject());
        } catch (error) {
            console.error('[SessionMongooseRepository] Error creating session:', error);
            throw error;
        }
    }

    async updateSession(id, updateData) {
        try {
            const result = await this.model.findByIdAndUpdate(
                id,
                { 
                    ...updateData,
                    updatedAt: new Date()
                },
                { new: true }
            );
            return result ? this.convertId(result.toObject()) : null;
        } catch (error) {
            console.error('[SessionMongooseRepository] Error updating session:', error);
            throw error;
        }
    }

    async endSession(id) {
        try {
            const result = await this.model.findByIdAndUpdate(
                id,
                { 
                    ended_at: new Date(),
                    updatedAt: new Date()
                },
                { new: true }
            );
            return result ? this.convertId(result.toObject()) : null;
        } catch (error) {
            console.error('[SessionMongooseRepository] Error ending session:', error);
            throw error;
        }
    }

    async deleteByUserId(userId) {
        try {
            const result = await this.model.deleteMany({ userId });
            return result.deletedCount;
        } catch (error) {
            console.error('[SessionMongooseRepository] Error deleting sessions by userId:', error);
            throw error;
        }
    }
}

module.exports = new SessionMongooseRepository(); 