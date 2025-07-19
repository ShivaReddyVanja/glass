// Firebase repository removed - will be replaced with MongoDB
const sqliteRepository = require('./sqlite.repository');

let authService = null;

function setAuthService(service) {
    authService = service;
}

function getBaseRepository() {
    if (!authService) {
        throw new Error('AuthService not set for userModelSelections repository');
    }
    
    const user = authService.getCurrentUser();
    return user.isLoggedIn ? sqliteRepository : sqliteRepository; // TODO: Replace with MongoDB repository
}

const userModelSelectionsRepositoryAdapter = {
    async get() {
        const repo = getBaseRepository();
        const uid = authService.getCurrentUserId();
        return await repo.get(uid);
    },

    async upsert(selections) {
        const repo = getBaseRepository();
        const uid = authService.getCurrentUserId();
        const now = Date.now();
        
        const selectionsWithMeta = {
            ...selections,
            uid,
            updated_at: now
        };
        
        return await repo.upsert(uid, selectionsWithMeta);
    },

    async remove() {
        const repo = getBaseRepository();
        const uid = authService.getCurrentUserId();
        return await repo.remove(uid);
    }
};

module.exports = {
    ...userModelSelectionsRepositoryAdapter,
    setAuthService
}; 