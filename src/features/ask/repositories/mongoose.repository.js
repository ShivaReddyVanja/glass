const MongooseRepository = require('../../common/repositories/mongooseRepository');
const { AiMessage } = require('./../../../../mongodb_models');

class AiMessageMongooseRepository extends MongooseRepository {
    constructor() {
        super(AiMessage);
    }

    async findBySessionId(sessionId) {
        try {
            const messages = await this.model.find({ sessionId }).sort({ sent_at: 1 });
            return this.convertIds(messages.map(doc => doc.toObject()));
        } catch (error) {
            console.error('[AiMessageMongooseRepository] Error finding messages by sessionId:', error);
            throw error;
        }
    }

    async findBySessionIdAndRole(sessionId, role) {
        try {
            const messages = await this.model.find({ 
                sessionId, 
                role 
            }).sort({ sent_at: 1 });
            return this.convertIds(messages.map(doc => doc.toObject()));
        } catch (error) {
            console.error('[AiMessageMongooseRepository] Error finding messages by sessionId and role:', error);
            throw error;
        }
    }

    async createMessage(messageData) {
        try {
            const message = new this.model({
                ...messageData,
                sent_at: new Date(),
                createdAt: new Date()
            });
            const savedMessage = await message.save();
            return this.convertId(savedMessage.toObject());
        } catch (error) {
            console.error('[AiMessageMongooseRepository] Error creating message:', error);
            throw error;
        }
    }

    async createBatchMessages(messagesData) {
        try {
            const messages = messagesData.map(data => ({
                ...data,
                sent_at: new Date(),
                createdAt: new Date()
            }));

            const savedMessages = await this.model.insertMany(messages);
            return this.convertIds(savedMessages.map(doc => doc.toObject()));
        } catch (error) {
            console.error('[AiMessageMongooseRepository] Error creating batch messages:', error);
            throw error;
        }
    }

    async updateMessage(id, updateData) {
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
            console.error('[AiMessageMongooseRepository] Error updating message:', error);
            throw error;
        }
    }

    async deleteBySessionId(sessionId) {
        try {
            const result = await this.model.deleteMany({ sessionId });
            return result.deletedCount;
        } catch (error) {
            console.error('[AiMessageMongooseRepository] Error deleting messages by sessionId:', error);
            throw error;
        }
    }

    async getMessageCount(sessionId) {
        try {
            return await this.model.countDocuments({ sessionId });
        } catch (error) {
            console.error('[AiMessageMongooseRepository] Error getting message count:', error);
            throw error;
        }
    }

    async getTotalTokens(sessionId) {
        try {
            const result = await this.model.aggregate([
                { $match: { sessionId } },
                { $group: { _id: null, totalTokens: { $sum: '$tokens' } } }
            ]);
            return result.length > 0 ? result[0].totalTokens : 0;
        } catch (error) {
            console.error('[AiMessageMongooseRepository] Error getting total tokens:', error);
            throw error;
        }
    }
}

module.exports = new AiMessageMongooseRepository(); 