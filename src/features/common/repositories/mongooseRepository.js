const mongoose = require('mongoose');

class MongooseRepository {
    constructor(model) {
        this.model = model;
    }

    // Helper method to convert MongoDB ObjectId to string
    convertId(data) {
        if (data && data._id) {
            data.id = data._id.toString();
            delete data._id;
        }
        return data;
    }

    // Helper method to convert array of documents
    convertIds(dataArray) {
        return dataArray.map(doc => this.convertId(doc));
    }

    // Generic CRUD operations
    async create(data) {
        try {
            const document = new this.model(data);
            const savedDoc = await document.save();
            return this.convertId(savedDoc.toObject());
        } catch (error) {
            console.error(`[MongooseRepository] Error creating document in ${this.model.modelName}:`, error);
            throw error;
        }
    }

    async findById(id) {
        try {
            const document = await this.model.findById(id);
            return document ? this.convertId(document.toObject()) : null;
        } catch (error) {
            console.error(`[MongooseRepository] Error finding document by ID in ${this.model.modelName}:`, error);
            throw error;
        }
    }

    async findByUid(uid) {
        try {
            const document = await this.model.findOne({ uid });
            return document ? this.convertId(document.toObject()) : null;
        } catch (error) {
            console.error(`[MongooseRepository] Error finding document by UID in ${this.model.modelName}:`, error);
            throw error;
        }
    }

    async findAllByUid(uid) {
        try {
            const documents = await this.model.find({ uid });
            return this.convertIds(documents.map(doc => doc.toObject()));
        } catch (error) {
            console.error(`[MongooseRepository] Error finding documents by UID in ${this.model.modelName}:`, error);
            throw error;
        }
    }

    async update(id, updateData) {
        try {
            const result = await this.model.findByIdAndUpdate(
                id,
                { ...updateData, updatedAt: new Date() },
                { new: true }
            );
            return result ? this.convertId(result.toObject()) : null;
        } catch (error) {
            console.error(`[MongooseRepository] Error updating document in ${this.model.modelName}:`, error);
            throw error;
        }
    }

    async delete(id) {
        try {
            const result = await this.model.findByIdAndDelete(id);
            return !!result;
        } catch (error) {
            console.error(`[MongooseRepository] Error deleting document in ${this.model.modelName}:`, error);
            throw error;
        }
    }

    async deleteByUid(uid) {
        try {
            const result = await this.model.deleteMany({ uid });
            return result.deletedCount;
        } catch (error) {
            console.error(`[MongooseRepository] Error deleting documents by UID in ${this.model.modelName}:`, error);
            throw error;
        }
    }

    // Additional helper methods
    async findOne(filter) {
        try {
            const document = await this.model.findOne(filter);
            return document ? this.convertId(document.toObject()) : null;
        } catch (error) {
            console.error(`[MongooseRepository] Error finding document in ${this.model.modelName}:`, error);
            throw error;
        }
    }

    async find(filter, sort = {}) {
        try {
            const documents = await this.model.find(filter).sort(sort);
            return this.convertIds(documents.map(doc => doc.toObject()));
        } catch (error) {
            console.error(`[MongooseRepository] Error finding documents in ${this.model.modelName}:`, error);
            throw error;
        }
    }

    async count(filter = {}) {
        try {
            return await this.model.countDocuments(filter);
        } catch (error) {
            console.error(`[MongooseRepository] Error counting documents in ${this.model.modelName}:`, error);
            throw error;
        }
    }
}

module.exports = MongooseRepository; 