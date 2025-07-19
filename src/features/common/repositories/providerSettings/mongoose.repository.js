const MongooseRepository = require('../mongooseRepository');
const { ProviderSettings } = require('./../../../../../mongodb_models');

class ProviderSettingsMongooseRepository extends MongooseRepository {
    constructor() {
        super(ProviderSettings);
    }

    async findByUserId(userId) {
        try {
            const settings = await this.model.find({ userId }).sort({ createdAt: -1 });
            return this.convertIds(settings.map(doc => doc.toObject()));
        } catch (error) {
            console.error('[ProviderSettingsMongooseRepository] Error finding settings by userId:', error);
            throw error;
        }
    }

    async findByUserIdAndProvider(userId, provider) {
        try {
            const setting = await this.model.findOne({ userId, provider });
            return setting ? this.convertId(setting.toObject()) : null;
        } catch (error) {
            console.error('[ProviderSettingsMongooseRepository] Error finding settings by userId and provider:', error);
            throw error;
        }
    }

    async createOrUpdateSettings(settingsData) {
        try {
            const { userId, provider } = settingsData;
            
            // Check if settings already exist for this user and provider
            let settings = await this.model.findOne({ userId, provider });
            
            if (settings) {
                // Update existing settings
                settings = await this.model.findOneAndUpdate(
                    { userId, provider },
                    { 
                        ...settingsData,
                        updatedAt: new Date()
                    },
                    { new: true }
                );
                console.log(`[ProviderSettingsMongooseRepository] Updated settings for user: ${userId}, provider: ${provider}`);
            } else {
                // Create new settings
                settings = new this.model({
                    ...settingsData,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                await settings.save();
                console.log(`[ProviderSettingsMongooseRepository] Created settings for user: ${userId}, provider: ${provider}`);
            }
            
            return this.convertId(settings.toObject());
        } catch (error) {
            console.error('[ProviderSettingsMongooseRepository] Error creating/updating settings:', error);
            throw error;
        }
    }

    async updateApiKey(userId, provider, apiKey) {
        try {
            const result = await this.model.findOneAndUpdate(
                { userId, provider },
                { 
                    apiKey,
                    updatedAt: new Date()
                },
                { new: true }
            );
            return result ? this.convertId(result.toObject()) : null;
        } catch (error) {
            console.error('[ProviderSettingsMongooseRepository] Error updating API key:', error);
            throw error;
        }
    }

    async updateModelSelection(userId, provider, modelType, modelName) {
        try {
            const updateData = { updatedAt: new Date() };
            if (modelType === 'llm') {
                updateData.selected_llm_model = modelName;
            } else if (modelType === 'stt') {
                updateData.selected_stt_model = modelName;
            }

            const result = await this.model.findOneAndUpdate(
                { userId, provider },
                updateData,
                { new: true }
            );
            return result ? this.convertId(result.toObject()) : null;
        } catch (error) {
            console.error('[ProviderSettingsMongooseRepository] Error updating model selection:', error);
            throw error;
        }
    }

    async deleteByUserId(userId) {
        try {
            const result = await this.model.deleteMany({ userId });
            return result.deletedCount;
        } catch (error) {
            console.error('[ProviderSettingsMongooseRepository] Error deleting settings by userId:', error);
            throw error;
        }
    }
}

module.exports = new ProviderSettingsMongooseRepository(); 