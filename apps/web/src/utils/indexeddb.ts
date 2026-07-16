/**
 * Raj Enterprises — IndexedDB Guest Cart (Dexie.js)
 *
 * Persists cart for unauthenticated (guest) users.
 * On login, this cart is merged into the server-side cart.
 * Merge strategy: sum quantities, capped at available stock.
 */

import Dexie, { type Table } from 'dexie';

export interface GuestCartItem {
  product_id: string;
  quantity: number;
  selected: boolean;
  added_at: number;
}

class GuestCartDB extends Dexie {
  cart!: Table<GuestCartItem, string>;

  constructor() {
    super('raj_enterprises_guest_cart');
    this.version(1).stores({
      cart: 'product_id',
    });
  }
}

const db = new GuestCartDB();

export const guestCartDB = {
  /** Get all items in the guest cart */
  async getAll(): Promise<GuestCartItem[]> {
    return db.cart.toArray();
  },

  /** Add or increment item in guest cart */
  async addItem(product_id: string, quantity: number = 1): Promise<void> {
    const existing = await db.cart.get(product_id);
    if (existing) {
      await db.cart.update(product_id, {
        quantity: existing.quantity + quantity,
      });
    } else {
      // Check 20-item limit
      const count = await db.cart.count();
      if (count >= 20) {
        throw new Error('Cart cannot have more than 20 distinct products.');
      }
      await db.cart.add({
        product_id,
        quantity,
        selected: true,
        added_at: Date.now(),
      });
    }
  },

  /** Update item quantity or selection */
  async updateItem(product_id: string, updates: Partial<GuestCartItem>): Promise<void> {
    const existing = await db.cart.get(product_id);
    if (!existing) return;

    if (updates.quantity !== undefined && updates.quantity <= 0) {
      await db.cart.delete(product_id);
    } else {
      await db.cart.update(product_id, updates);
    }
  },

  /** Remove item from guest cart */
  async removeItem(product_id: string): Promise<void> {
    await db.cart.delete(product_id);
  },

  /** Clear entire guest cart (e.g., after merging on login) */
  async clear(): Promise<void> {
    await db.cart.clear();
  },

  /** Get item count */
  async count(): Promise<number> {
    return db.cart.count();
  },
};

export default guestCartDB;
