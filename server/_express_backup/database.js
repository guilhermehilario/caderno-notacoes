import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'db.json');

/**
 * 🗄️ Coleções padrão inicializadas quando o db.json não existe.
 * `studySessions` foi adicionada para suportar persistência de sessão.
 */
const DEFAULT_COLLECTIONS = {
  users: [],
  notebooks: [],
  leaves: [],
  flashcards: [],
  studySessions: [],
};

let inMemoryDb = null;

async function loadDb() {
  if (inMemoryDb) return inMemoryDb;
  try {
    const content = await fs.readFile(dbPath, 'utf8');
    inMemoryDb = JSON.parse(content);

    // Garante que coleções novas existam mesmo em db.json existente
    for (const [key, defaultValue] of Object.entries(DEFAULT_COLLECTIONS)) {
      if (!inMemoryDb[key]) {
        inMemoryDb[key] = defaultValue;
      }
    }
  } catch (error) {
    inMemoryDb = { ...DEFAULT_COLLECTIONS };
    await saveDb();
  }
  return inMemoryDb;
}

async function saveDb() {
  if (!inMemoryDb) return;
  await fs.writeFile(dbPath, JSON.stringify(inMemoryDb, null, 2), 'utf8');
}

export const db = {
  async get(collection) {
    const data = await loadDb();
    return data[collection] || [];
  },

  async save(collection, items) {
    const data = await loadDb();
    data[collection] = items;
    await saveDb();
  },

  async insert(collection, item) {
    const data = await loadDb();
    if (!data[collection]) data[collection] = [];
    data[collection].push(item);
    await saveDb();
    return item;
  },

  async update(collection, id, updates) {
    const data = await loadDb();
    const items = data[collection] || [];
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return null;
    items[index] = {
      ...items[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await saveDb();
    return items[index];
  },

  async delete(collection, id) {
    const data = await loadDb();
    const items = data[collection] || [];
    data[collection] = items.filter((item) => item.id !== id);
    await saveDb();
    return true;
  },
};
