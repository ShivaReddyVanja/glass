// MongoDB/Mongoose Models for PickleGlass Migration
// Each schema maps to a Firestore collection previously used in the project.
// Adjust fields/types as needed for your application.

const mongoose = require('mongoose');
const encryptionService = require('./src/features/common/services/encryptionService');

// Helper function to encrypt sensitive fields
const encryptField = function(field) {
    if (field && typeof field === 'string') {
        return encryptionService.encrypt(field);
    }
    return field;
};

// Helper function to decrypt sensitive fields
const decryptField = function(field) {
    if (field && typeof field === 'string') {
        try {
            return encryptionService.decrypt(field);
        } catch (error) {
            console.warn('Failed to decrypt field:', error.message);
            return field;
        }
    }
    return field;
};

/**
 * User Schema
 * ----------------
 * Purpose: Stores user account information for each registered user.
 * Why: Represents both authenticated (NextAuth) and local users.
 * What it represents: User identity, profile, and role in the app.
 * Key fields: uid (unique user ID), email, displayName, photoURL, role.
 * Usage: Used for authentication, authorization, and associating data (sessions, presets, etc.) to a user.
 */
const UserSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true }, // NextAuth UID
  email: { type: String, required: true, unique: true },
  displayName: { type: String },
  photoURL: { type: String },
  role: { type: String }, // e.g., 'interviewer', 'interviewee'
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Encrypt sensitive fields before saving
UserSchema.pre('save', function(next) {
  if (this.isModified('displayName')) {
    this.displayName = encryptField(this.displayName);
  }
  if (this.isModified('email')) {
    this.email = encryptField(this.email);
  }
  this.updatedAt = new Date();
  next();
});

// Decrypt sensitive fields after retrieving
UserSchema.post('find', function(docs) {
  if (Array.isArray(docs)) {
    docs.forEach(doc => {
      if (doc.displayName) doc.displayName = decryptField(doc.displayName);
      if (doc.email) doc.email = decryptField(doc.email);
    });
  }
});

UserSchema.post('findOne', function(doc) {
  if (doc) {
    if (doc.displayName) doc.displayName = decryptField(doc.displayName);
    if (doc.email) doc.email = decryptField(doc.email);
  }
});
const User = mongoose.model('User', UserSchema);

/**
 * Session Schema
 * ----------------
 * Purpose: Stores information about each user session (e.g., an interview or chat session).
 * Why: Sessions group together related activities, transcripts, AI messages, and summaries.
 * What it represents: A single session or conversation context for a user.
 * Key fields: userId (owner), title, timestamps.
 * Usage: Used to fetch all data related to a specific session, and to organize user history.
 */
const SessionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true }, // Reference to User.uid
  title: { type: String },
  session_type: { type: String, default: 'ask' },
  started_at: { type: Date, default: Date.now },
  ended_at: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Encrypt sensitive fields before saving
SessionSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.title = encryptField(this.title);
  }
  this.updatedAt = new Date();
  next();
});

// Decrypt sensitive fields after retrieving
SessionSchema.post('find', function(docs) {
  if (Array.isArray(docs)) {
    docs.forEach(doc => {
      if (doc.title) doc.title = decryptField(doc.title);
    });
  }
});

SessionSchema.post('findOne', function(doc) {
  if (doc && doc.title) {
    doc.title = decryptField(doc.title);
  }
});
const Session = mongoose.model('Session', SessionSchema);

/**
 * Preset Schema
 * ----------------
 * Purpose: Stores user-defined prompt presets for AI interactions.
 * Why: Allows users to save and reuse custom prompts for different tasks or sessions.
 * What it represents: A named prompt template associated with a user.
 * Key fields: userId (owner), prompt, title, timestamps.
 * Usage: Used to quickly load and apply user-specific prompt templates in the UI.
 */
const PresetSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  prompt: { type: String },
  title: { type: String },
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Encrypt sensitive fields before saving
PresetSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.title = encryptField(this.title);
  }
  if (this.isModified('prompt')) {
    this.prompt = encryptField(this.prompt);
  }
  this.updatedAt = new Date();
  next();
});

// Decrypt sensitive fields after retrieving
PresetSchema.post('find', function(docs) {
  if (Array.isArray(docs)) {
    docs.forEach(doc => {
      if (doc.title) doc.title = decryptField(doc.title);
      if (doc.prompt) doc.prompt = decryptField(doc.prompt);
    });
  }
});

PresetSchema.post('findOne', function(doc) {
  if (doc) {
    if (doc.title) doc.title = decryptField(doc.title);
    if (doc.prompt) doc.prompt = decryptField(doc.prompt);
  }
});
const Preset = mongoose.model('Preset', PresetSchema);

/**
 * ProviderSettings Schema
 * ----------------
 * Purpose: Stores API keys and model selections for each user (e.g., LLM or STT provider preferences).
 * Why: Allows users to configure which AI/LLM/STT providers and models they want to use.
 * What it represents: User-specific settings for external service providers.
 * Key fields: userId (owner), apiKey, selected_llm_model, selected_stt_model, timestamps.
 * Usage: Used to fetch and apply user preferences for AI and speech-to-text services.
 */
const ProviderSettingsSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  provider: { type: String, required: true }, // e.g., 'openai', 'anthropic', etc.
  apiKey: { type: String }, // Store encrypted
  selected_llm_model: { type: String },
  selected_stt_model: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Encrypt sensitive fields before saving
ProviderSettingsSchema.pre('save', function(next) {
  if (this.isModified('apiKey')) {
    this.apiKey = encryptField(this.apiKey);
  }
  this.updatedAt = new Date();
  next();
});

// Decrypt sensitive fields after retrieving
ProviderSettingsSchema.post('find', function(docs) {
  if (Array.isArray(docs)) {
    docs.forEach(doc => {
      if (doc.apiKey) doc.apiKey = decryptField(doc.apiKey);
    });
  }
});

ProviderSettingsSchema.post('findOne', function(doc) {
  if (doc && doc.apiKey) {
    doc.apiKey = decryptField(doc.apiKey);
  }
});
const ProviderSettings = mongoose.model('ProviderSettings', ProviderSettingsSchema);

/**
 * AiMessage Schema
 * ----------------
 * Purpose: Stores messages generated by the AI during a session.
 * Why: Keeps a record of all AI responses for each session, enabling chat history and context.
 * What it represents: A single AI-generated message within a session.
 * Key fields: sessionId (parent), content, createdAt.
 * Usage: Used to display conversation history and context for ongoing or past sessions.
 */
const AiMessageSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  role: { type: String, enum: ['user', 'assistant'], default: 'user' },
  content: { type: String }, // Store encrypted
  tokens: { type: Number },
  model: { type: String },
  sent_at: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

// Encrypt sensitive fields before saving
AiMessageSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    this.content = encryptField(this.content);
  }
  next();
});

// Decrypt sensitive fields after retrieving
AiMessageSchema.post('find', function(docs) {
  if (Array.isArray(docs)) {
    docs.forEach(doc => {
      if (doc.content) doc.content = decryptField(doc.content);
    });
  }
});

AiMessageSchema.post('findOne', function(doc) {
  if (doc && doc.content) {
    doc.content = decryptField(doc.content);
  }
});
const AiMessage = mongoose.model('AiMessage', AiMessageSchema);

/**
 * Summary Schema
 * ----------------
 * Purpose: Stores session summaries, including TLDR, main text, bullet points, and action items.
 * Why: Allows users to quickly review the key points and actions from a session.
 * What it represents: A summary document for a session, often generated by AI.
 * Key fields: sessionId (parent), tldr, text, bullet_json, action_json, createdAt.
 * Usage: Used to display concise overviews and actionable items for each session.
 */
const SummarySchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  tldr: { type: String }, // Store encrypted
  text: { type: String }, // Store encrypted
  bullet_json: { type: String }, // Store encrypted
  action_json: { type: String }, // Store encrypted
  model: { type: String },
  tokens_used: { type: Number },
  generated_at: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

// Encrypt sensitive fields before saving
SummarySchema.pre('save', function(next) {
  if (this.isModified('tldr')) {
    this.tldr = encryptField(this.tldr);
  }
  if (this.isModified('text')) {
    this.text = encryptField(this.text);
  }
  if (this.isModified('bullet_json')) {
    this.bullet_json = encryptField(this.bullet_json);
  }
  if (this.isModified('action_json')) {
    this.action_json = encryptField(this.action_json);
  }
  next();
});

// Decrypt sensitive fields after retrieving
SummarySchema.post('find', function(docs) {
  if (Array.isArray(docs)) {
    docs.forEach(doc => {
      if (doc.tldr) doc.tldr = decryptField(doc.tldr);
      if (doc.text) doc.text = decryptField(doc.text);
      if (doc.bullet_json) doc.bullet_json = decryptField(doc.bullet_json);
      if (doc.action_json) doc.action_json = decryptField(doc.action_json);
    });
  }
});

SummarySchema.post('findOne', function(doc) {
  if (doc) {
    if (doc.tldr) doc.tldr = decryptField(doc.tldr);
    if (doc.text) doc.text = decryptField(doc.text);
    if (doc.bullet_json) doc.bullet_json = decryptField(doc.bullet_json);
    if (doc.action_json) doc.action_json = decryptField(doc.action_json);
  }
});
const Summary = mongoose.model('Summary', SummarySchema);

/**
 * Transcript Schema
 * ----------------
 * Purpose: Stores speech-to-text (STT) transcripts for each session.
 * Why: Enables review, search, and analysis of spoken content in sessions.
 * What it represents: A single transcript segment (or full transcript) for a session.
 * Key fields: sessionId (parent), text, startAt, endAt, createdAt.
 * Usage: Used to display and analyze spoken content, and to provide context for AI and summaries.
 */
const TranscriptSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  speaker: { type: String },
  text: { type: String }, // Store encrypted
  lang: { type: String, default: 'en' },
  start_at: { type: Date },
  end_at: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// Encrypt sensitive fields before saving
TranscriptSchema.pre('save', function(next) {
  if (this.isModified('text')) {
    this.text = encryptField(this.text);
  }
  if (this.isModified('speaker')) {
    this.speaker = encryptField(this.speaker);
  }
  next();
});

// Decrypt sensitive fields after retrieving
TranscriptSchema.post('find', function(docs) {
  if (Array.isArray(docs)) {
    docs.forEach(doc => {
      if (doc.text) doc.text = decryptField(doc.text);
      if (doc.speaker) doc.speaker = decryptField(doc.speaker);
    });
  }
});

TranscriptSchema.post('findOne', function(doc) {
  if (doc) {
    if (doc.text) doc.text = decryptField(doc.text);
    if (doc.speaker) doc.speaker = decryptField(doc.speaker);
  }
});
const Transcript = mongoose.model('Transcript', TranscriptSchema);

// Export all models
module.exports = {
  User,
  Session,
  Preset,
  ProviderSettings,
  AiMessage,
  Summary,
  Transcript
}; 