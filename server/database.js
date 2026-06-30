import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'db.json');

let inMemoryDb = null;

async function loadDb() {
  if (inMemoryDb) return inMemoryDb;
  try {
    const content = await fs.readFile(dbPath, 'utf8');
    inMemoryDb = JSON.parse(content);
  } catch (error) {
    // If file doesn't exist, initialize it
    inMemoryDb = { users: [], notebooks: [], leaves: [], flashcards: [] };
    await saveDb();
  }
  return inMemoryDb;
}

async function saveDb() {
  if (!inMemoryDb) return;
  await fs.writeFile(dbPath, JSON.stringify(inMemoryDb, null, 2), 'utf8');
}

export const db = {
  get: async (collection) => {
    const data = await loadDb();
    return data[collection] || [];
  },
  
  save: async (collection, items) => {
    const data = await loadDb();
    data[collection] = items;
    await saveDb();
  },

  insert: async (collection, item) => {
    const data = await loadDb();
    if (!data[collection]) data[collection] = [];
    data[collection].push(item);
    await saveDb();
    return item;
  },

  update: async (collection, id, updates) => {
    const data = await loadDb();
    const items = data[collection] || [];
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return null;
    items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
    await saveDb();
    return items[index];
  },

  delete: async (collection, id) => {
    const data = await loadDb();
    const items = data[collection] || [];
    const filtered = items.filter(item => item.id !== id);
    data[collection] = filtered;
    await saveDb();
    return true;
  }
};
