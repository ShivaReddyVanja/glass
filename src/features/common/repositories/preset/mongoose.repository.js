const MongooseRepository = require('../mongooseRepository');
const { Preset } = require('./../../../../../mongodb_models');

class PresetMongooseRepository extends MongooseRepository {
    constructor() {
        super(Preset);
    }

    async findByUserId(userId) {
        try {
            const presets = await this.model.find({ userId }).sort({ createdAt: -1 });
            return this.convertIds(presets.map(doc => doc.toObject()));
        } catch (error) {
            console.error('[PresetMongooseRepository] Error finding presets by userId:', error);
            throw error;
        }
    }

    async findDefaultByUserId(userId) {
        try {
            const presets = await this.model.find({ 
                userId, 
                isDefault: true 
            }).sort({ createdAt: -1 });
            return this.convertIds(presets.map(doc => doc.toObject()));
        } catch (error) {
            console.error('[PresetMongooseRepository] Error finding default presets by userId:', error);
            throw error;
        }
    }

    async createPreset(presetData) {
        try {
            const preset = new this.model({
                ...presetData,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            const savedPreset = await preset.save();
            return this.convertId(savedPreset.toObject());
        } catch (error) {
            console.error('[PresetMongooseRepository] Error creating preset:', error);
            throw error;
        }
    }

    async updatePreset(id, updateData) {
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
            console.error('[PresetMongooseRepository] Error updating preset:', error);
            throw error;
        }
    }

    async setAsDefault(id, userId) {
        try {
            // First, remove default from all other presets for this user
            await this.model.updateMany(
                { userId, isDefault: true },
                { isDefault: false, updatedAt: new Date() }
            );

            // Then set this preset as default
            const result = await this.model.findByIdAndUpdate(
                id,
                { 
                    isDefault: true,
                    updatedAt: new Date()
                },
                { new: true }
            );
            return result ? this.convertId(result.toObject()) : null;
        } catch (error) {
            console.error('[PresetMongooseRepository] Error setting preset as default:', error);
            throw error;
        }
    }

    async deleteByUserId(userId) {
        try {
            const result = await this.model.deleteMany({ userId });
            return result.deletedCount;
        } catch (error) {
            console.error('[PresetMongooseRepository] Error deleting presets by userId:', error);
            throw error;
        }
    }
}

module.exports = new PresetMongooseRepository(); 