import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface InStoreAddOn {
  addOnId: string;
  name: string;
  price: number;
}

export interface InStoreCartItem {
  id: string; // unique key for this cart row
  menuItemId: string;
  menuItemName: string;
  category: string;
  quantity: number;
  size: 'SMALL' | 'MEDIUM' | 'LARGE' | null;
  milkType: string | null;
  temperature: 'HOT' | 'ICED' | null;
  addOns: InStoreAddOn[];
  notes: string;
  unitPrice: number;
  imageUrl: string | null;
  // For retail packages sold in-store
  packageId?: string;
  packageName?: string;
}

interface InStoreCartStore {
  items: InStoreCartItem[];
  customerName: string;

  addItem: (item: Omit<InStoreCartItem, 'id' | 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  setCustomerName: (name: string) => void;
  clearCart: () => void;

  getSubtotal: () => number;
  getItemCount: () => number;
}

let itemCounter = 0;

export const useInStoreCartStore = create<InStoreCartStore>()(
  persist(
    (set, get) => ({
      items: [],
      customerName: '',

      addItem: (item) => {
        itemCounter++;
        const id = `instore-${Date.now()}-${itemCounter}`;
        set((state) => ({
          items: [...state.items, { ...item, id, quantity: 1 }],
        }));
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        }));
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          ),
        }));
      },

      setCustomerName: (name) => {
        set({ customerName: name });
      },

      clearCart: () => {
        set({ items: [], customerName: '' });
      },

      getSubtotal: () => {
        return get().items.reduce(
          (total, item) => total + item.unitPrice * item.quantity,
          0
        );
      },

      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'eco-instore-cart',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? sessionStorage : {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        }
      ),
    }
  )
);
