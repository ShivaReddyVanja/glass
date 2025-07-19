// MongoDB migration logic - placeholder for future implementation
const sqliteUserRepo = require('../repositories/user/sqlite.repository');

async function checkAndRunMigration(nextAuthUser) {
    if (!nextAuthUser || !nextAuthUser.uid) {
        console.log('[Migration] No NextAuth user provided, skipping migration.');
        return;
    }

    console.log(`[Migration] Checking for user ${nextAuthUser.uid}...`);

    try {
        const localUser = sqliteUserRepo.getById(nextAuthUser.uid);
        if (!localUser || localUser.has_migrated_to_mongo) {
            console.log(`[Migration] User ${nextAuthUser.uid} is not eligible or already migrated.`);
            return;
        }

        console.log(`[Migration] Starting data migration for user ${nextAuthUser.uid}...`);
        console.log(`[Migration] TODO: Implement MongoDB migration logic`);

        // Mark migration as complete
        sqliteUserRepo.setMigrationComplete(nextAuthUser.uid);
        console.log(`[Migration] ✅ Successfully marked migration as complete for ${nextAuthUser.uid}.`);

    } catch (error) {
        console.error(`[Migration] 🔥 An error occurred during migration for user ${nextAuthUser.uid}:`, error);
        throw error;
    }
}

module.exports = {
    checkAndRunMigration,
}; 