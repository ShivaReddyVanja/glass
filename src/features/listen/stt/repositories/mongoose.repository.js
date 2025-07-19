const MongooseRepository = require('../../../common/repositories/mongooseRepository');
const { Transcript } = require('./../../../../../mongodb_models');

class TranscriptMongooseRepository extends MongooseRepository {
    constructor() {
        super(Transcript);
    }

    async findBySessionId(sessionId) {
        try {
            const transcripts = await this.model.find({ sessionId }).sort({ start_at: 1 });
            return this.convertIds(transcripts.map(doc => doc.toObject()));
        } catch (error) {
            console.error('[TranscriptMongooseRepository] Error finding transcripts by sessionId:', error);
            throw error;
        }
    }

    async findBySessionIdAndSpeaker(sessionId, speaker) {
        try {
            const transcripts = await this.model.find({ 
                sessionId, 
                speaker 
            }).sort({ start_at: 1 });
            return this.convertIds(transcripts.map(doc => doc.toObject()));
        } catch (error) {
            console.error('[TranscriptMongooseRepository] Error finding transcripts by sessionId and speaker:', error);
            throw error;
        }
    }

    async createTranscript(transcriptData) {
        try {
            const transcript = new this.model({
                ...transcriptData,
                createdAt: new Date()
            });
            const savedTranscript = await transcript.save();
            return this.convertId(savedTranscript.toObject());
        } catch (error) {
            console.error('[TranscriptMongooseRepository] Error creating transcript:', error);
            throw error;
        }
    }

    async createBatchTranscripts(transcriptsData) {
        try {
            const transcripts = transcriptsData.map(data => ({
                ...data,
                createdAt: new Date()
            }));

            const savedTranscripts = await this.model.insertMany(transcripts);
            return this.convertIds(savedTranscripts.map(doc => doc.toObject()));
        } catch (error) {
            console.error('[TranscriptMongooseRepository] Error creating batch transcripts:', error);
            throw error;
        }
    }

    async updateTranscript(id, updateData) {
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
            console.error('[TranscriptMongooseRepository] Error updating transcript:', error);
            throw error;
        }
    }

    async deleteBySessionId(sessionId) {
        try {
            const result = await this.model.deleteMany({ sessionId });
            return result.deletedCount;
        } catch (error) {
            console.error('[TranscriptMongooseRepository] Error deleting transcripts by sessionId:', error);
            throw error;
        }
    }

    async getTranscriptCount(sessionId) {
        try {
            return await this.model.countDocuments({ sessionId });
        } catch (error) {
            console.error('[TranscriptMongooseRepository] Error getting transcript count:', error);
            throw error;
        }
    }

    async getFullTranscriptText(sessionId) {
        try {
            const transcripts = await this.model.find({ sessionId }).sort({ start_at: 1 });
            return transcripts.map(t => t.text).join(' ');
        } catch (error) {
            console.error('[TranscriptMongooseRepository] Error getting full transcript text:', error);
            throw error;
        }
    }

    async getTranscriptsByTimeRange(sessionId, startTime, endTime) {
        try {
            const transcripts = await this.model.find({
                sessionId,
                start_at: { $gte: startTime, $lte: endTime }
            }).sort({ start_at: 1 });
            return this.convertIds(transcripts.map(doc => doc.toObject()));
        } catch (error) {
            console.error('[TranscriptMongooseRepository] Error getting transcripts by time range:', error);
            throw error;
        }
    }
}

module.exports = new TranscriptMongooseRepository(); 