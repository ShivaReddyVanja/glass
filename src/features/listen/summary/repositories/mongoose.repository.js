const MongooseRepository = require('../../../common/repositories/mongooseRepository');
const { Summary } = require('./../../../../../mongodb_models');

class SummaryMongooseRepository extends MongooseRepository {
    constructor() {
        super(Summary);
    }

    async findBySessionId(sessionId) {
        try {
            const summaries = await this.model.find({ sessionId }).sort({ generated_at: -1 });
            return this.convertIds(summaries.map(doc => doc.toObject()));
        } catch (error) {
            console.error('[SummaryMongooseRepository] Error finding summaries by sessionId:', error);
            throw error;
        }
    }

    async findLatestBySessionId(sessionId) {
        try {
            const summary = await this.model.findOne({ sessionId }).sort({ generated_at: -1 });
            return summary ? this.convertId(summary.toObject()) : null;
        } catch (error) {
            console.error('[SummaryMongooseRepository] Error finding latest summary by sessionId:', error);
            throw error;
        }
    }

    async createSummary(summaryData) {
        try {
            const summary = new this.model({
                ...summaryData,
                generated_at: new Date(),
                createdAt: new Date()
            });
            const savedSummary = await summary.save();
            return this.convertId(savedSummary.toObject());
        } catch (error) {
            console.error('[SummaryMongooseRepository] Error creating summary:', error);
            throw error;
        }
    }

    async updateSummary(id, updateData) {
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
            console.error('[SummaryMongooseRepository] Error updating summary:', error);
            throw error;
        }
    }

    async deleteBySessionId(sessionId) {
        try {
            const result = await this.model.deleteMany({ sessionId });
            return result.deletedCount;
        } catch (error) {
            console.error('[SummaryMongooseRepository] Error deleting summaries by sessionId:', error);
            throw error;
        }
    }

    async getSummaryCount(sessionId) {
        try {
            return await this.model.countDocuments({ sessionId });
        } catch (error) {
            console.error('[SummaryMongooseRepository] Error getting summary count:', error);
            throw error;
        }
    }

    async getTotalTokensUsed(sessionId) {
        try {
            const result = await this.model.aggregate([
                { $match: { sessionId } },
                { $group: { _id: null, totalTokens: { $sum: '$tokens_used' } } }
            ]);
            return result.length > 0 ? result[0].totalTokens : 0;
        } catch (error) {
            console.error('[SummaryMongooseRepository] Error getting total tokens used:', error);
            throw error;
        }
    }
}

module.exports = new SummaryMongooseRepository(); 