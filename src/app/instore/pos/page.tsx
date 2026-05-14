'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInStoreCartStore, type InStoreCartItem } from '@/lib/instore/cart-store';
import { calculateTax } from '@/lib/instore/tax';
import { usePrintSettings, printCupLabel } from '@/lib/instore/print-settings';
import { useTheme } from '@/components/ThemeContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MenuAddOn {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface Modifier {
  id: string;
  name: string;
  priceDelta: number;
}

interface ModifierGroup {
  id: string;
  name: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  modifiers: Modifier[];
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  basePrice: number;
  mediumPrice: number | null;
  largePrice: number | null;
  allowSizes: boolean;
  allowMilk: boolean;
  allowTemp: boolean;
  imageUrl: string | null;
  available: boolean;
  addOns: MenuAddOn[];
  modifierGroups: ModifierGroup[];
}

type OrderStatus = 'RECEIVED' | 'IN_PROGRESS' | 'READY' | 'PICKED_UP';

interface QueueOrder {
  id: string;
  orderNumber: string;
  displayNumber: number;
  customerName: string | null;
  status: OrderStatus;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  items: {
    id: string;
    quantity: number;
    menuItem: { name: string; category: string };
  }[];
}

interface DailySummary {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  activeOrders: number;
  totalRevenue: number;
  totalSubtotal: number;
  totalTax: number;
  cashCount: number;
  cashRevenue: number;
  cardCount: number;
  cardRevenue: number;
  kioskOrders: number;
  posOrders: number;
  totalItems: number;
  avgOrderValue: number;
}

interface RetailPackage {
  id: string;
  name: string;
  type: string;
  sizeOz: number;
  sizeDescription: string;
  price: number;
  grindType: string | null;
}

interface RetailCoffee {
  id: string;
  name: string;
  description: string | null;
  origin: string | null;
  roastLevel: string;
  imageUrl: string | null;
  menuItemId: string;
  packages: RetailPackage[];
}

type Size = 'SMALL' | 'MEDIUM' | 'LARGE';
type MilkType = 'WHOLE' | 'TWO_PERCENT' | 'OAT' | 'ALMOND' | 'SOY' | 'COCONUT' | 'NONE';
type Temperature = 'HOT' | 'ICED';

const CATEGORIES = ['Espresso', 'Drip', 'Cold', 'Tea', 'Food', 'Coffee'] as const;

const MILK_OPTIONS: { value: MilkType; label: string }[] = [
  { value: 'NONE', label: 'No Milk' },
  { value: 'WHOLE', label: 'Whole' },
  { value: 'TWO_PERCENT', label: '2%' },
  { value: 'OAT', label: 'Oat' },
  { value: 'ALMOND', label: 'Almond' },
  { value: 'SOY', label: 'Soy' },
  { value: 'COCONUT', label: 'Coconut' },
];

const STATUS_COLORS: Record<OrderStatus, string> = {
  RECEIVED: 'bg-neutral-600 text-neutral-100',
  IN_PROGRESS: 'bg-amber-600 text-amber-50',
  READY: 'bg-green-600 text-green-50',
  PICKED_UP: 'bg-blue-600 text-blue-50',
};

// STATUS_LABELS now comes from the active theme via useTheme().status

const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  RECEIVED: 'IN_PROGRESS',
  IN_PROGRESS: 'READY',
  READY: 'PICKED_UP',
  PICKED_UP: null,
};

// ---------------------------------------------------------------------------
// Customize Modal
// ---------------------------------------------------------------------------

function CustomizeModal({
  item,
  onAdd,
  onClose,
}: {
  item: MenuItem;
  onAdd: (payload: Omit<InStoreCartItem, 'id' | 'quantity'>) => void;
  onClose: () => void;
}) {
  const [size, setSize] = useState<Size>('SMALL');
  const [milk, setMilk] = useState<MilkType>('NONE');
  const [temp, setTemp] = useState<Temperature>('HOT');
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');

  // Modifier group selections — groupId → set of modifier ids.
  const [modifierSelections, setModifierSelections] = useState<
    Record<string, Set<string>>
  >(() => {
    const initial: Record<string, Set<string>> = {};
    for (const g of item.modifierGroups ?? []) {
      initial[g.id] =
        g.required && g.modifiers.length > 0
          ? new Set([g.modifiers[0].id])
          : new Set();
    }
    return initial;
  });

  const toggleAddOn = (id: string) => {
    setSelectedAddOns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleModifier = (group: ModifierGroup, modifierId: string) => {
    setModifierSelections((prev) => {
      const current = new Set(prev[group.id] ?? []);
      if (group.maxSelections === 1) {
        if (current.has(modifierId)) {
          if (!group.required) current.delete(modifierId);
        } else {
          current.clear();
          current.add(modifierId);
        }
      } else {
        if (current.has(modifierId)) {
          current.delete(modifierId);
        } else if (current.size < group.maxSelections) {
          current.add(modifierId);
        }
      }
      return { ...prev, [group.id]: current };
    });
  };

  const modifierAddOns = (item.modifierGroups ?? []).flatMap((g) => {
    const picked = modifierSelections[g.id] ?? new Set<string>();
    return g.modifiers
      .filter((m) => picked.has(m.id))
      .map((m) => ({ addOnId: m.id, name: m.name, price: m.priceDelta }));
  });

  const priceForSize = (s: Size): number => {
    if (s === 'MEDIUM' && item.mediumPrice != null) return item.mediumPrice;
    if (s === 'LARGE' && item.largePrice != null) return item.largePrice;
    return item.basePrice;
  };

  const sizeLabel = (s: Size): string => {
    const labels: Record<Size, string> = { SMALL: 'S', MEDIUM: 'M', LARGE: 'L' };
    return labels[s];
  };

  const computedUnitPrice = useMemo(() => {
    let price = item.allowSizes ? priceForSize(size) : item.basePrice;
    for (const ao of item.addOns) {
      if (selectedAddOns.has(ao.id)) price += ao.price;
    }
    for (const mod of modifierAddOns) {
      price += mod.price;
    }
    return Math.round(price * 100) / 100;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, selectedAddOns, item, modifierSelections]);

  const handleAdd = () => {
    // Validate required modifier groups
    for (const g of item.modifierGroups ?? []) {
      const count = modifierSelections[g.id]?.size ?? 0;
      if (g.required && count < g.minSelections) {
        alert(`${g.name} requires at least ${g.minSelections} selection${
          g.minSelections > 1 ? 's' : ''
        }`);
        return;
      }
    }

    const addOns = [
      ...item.addOns
        .filter((a) => selectedAddOns.has(a.id))
        .map((a) => ({ addOnId: a.id, name: a.name, price: a.price })),
      ...modifierAddOns,
    ];

    onAdd({
      menuItemId: item.id,
      menuItemName: item.name,
      category: item.category,
      size: item.allowSizes ? size : null,
      milkType: item.allowMilk ? milk : null,
      temperature: item.allowTemp ? temp : null,
      addOns,
      notes,
      unitPrice: computedUnitPrice,
      imageUrl: item.imageUrl,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-neutral-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{item.name}</h2>
            {item.description && (
              <p className="mt-1 text-sm text-neutral-400">{item.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-800 hover:text-white"
            aria-label="Close"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
          {/* Size selector */}
          {item.allowSizes && (
            <fieldset>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Size
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {(['SMALL', 'MEDIUM', 'LARGE'] as Size[]).map((s) => {
                  const price = priceForSize(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      className={`flex min-h-[48px] flex-col items-center justify-center rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-colors ${
                        size === s
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                          : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-500'
                      }`}
                    >
                      <span>{sizeLabel(s)}</span>
                      <span className="text-xs font-normal">${price.toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {/* Milk type */}
          {item.allowMilk && (
            <fieldset>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Milk
              </legend>
              <div className="grid grid-cols-4 gap-2">
                {MILK_OPTIONS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMilk(m.value)}
                    className={`min-h-[48px] rounded-lg border-2 px-2 py-2 text-xs font-semibold transition-colors ${
                      milk === m.value
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                        : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-500'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {/* Temperature toggle */}
          {item.allowTemp && (
            <fieldset>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Temperature
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {(['HOT', 'ICED'] as Temperature[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTemp(t)}
                    className={`min-h-[48px] rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-colors ${
                      temp === t
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                        : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-500'
                    }`}
                  >
                    {t === 'HOT' ? '☕ Hot' : '🧊 Iced'}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {/* Modifier groups */}
          {(item.modifierGroups ?? []).map((group) => {
            const picked = modifierSelections[group.id] ?? new Set<string>();
            const isRadio = group.maxSelections === 1;
            return (
              <fieldset key={group.id}>
                <div className="mb-2 flex items-baseline justify-between gap-3 flex-wrap">
                  <legend className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                    {group.name}
                    {group.required && (
                      <span className="ml-2 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5">
                        Required
                      </span>
                    )}
                  </legend>
                  {!isRadio && (
                    <span className="text-[10px] text-neutral-500">
                      {picked.size}/{group.maxSelections}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {group.modifiers.map((m) => {
                    const isSelected = picked.has(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleModifier(group, m.id)}
                        className={`min-h-[44px] rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-colors text-left ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                            : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-500'
                        }`}
                      >
                        <span className="block">{m.name}</span>
                        {m.priceDelta > 0 && (
                          <span className="block text-[10px] text-neutral-400">
                            +${m.priceDelta.toFixed(2)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}

          {/* Add-ons */}
          {item.addOns.length > 0 && (
            <fieldset>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Add-ons
              </legend>
              <div className="space-y-2">
                {item.addOns.map((ao) => (
                  <label
                    key={ao.id}
                    className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-lg border-2 px-3 py-2 transition-colors ${
                      selectedAddOns.has(ao.id)
                        ? 'border-emerald-500 bg-emerald-500/20'
                        : 'border-neutral-700 bg-neutral-800 hover:border-neutral-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={selectedAddOns.has(ao.id)}
                      onChange={() => toggleAddOn(ao.id)}
                    />
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 text-xs ${
                        selectedAddOns.has(ao.id)
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-neutral-500'
                      }`}
                    >
                      {selectedAddOns.has(ao.id) && '✓'}
                    </span>
                    <span className="flex-1 text-sm text-neutral-200">{ao.name}</span>
                    <span className="text-xs text-neutral-400">+${ao.price.toFixed(2)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {/* Notes */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Notes
            </label>
            <input
              type="text"
              placeholder="Extra hot, light foam, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border-2 border-neutral-700 bg-neutral-800 px-3 py-3 text-sm text-white placeholder-neutral-500 outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Footer */}
        <button
          type="button"
          onClick={handleAdd}
          className="mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-base font-bold text-white transition-colors hover:bg-emerald-500 active:bg-emerald-700"
        >
          Add to Order &mdash; ${computedUnitPrice.toFixed(2)}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main POS Page
// ---------------------------------------------------------------------------

export default function BaristaPosPage() {
  const theme = useTheme();
  const STATUS_LABELS = theme.status;
  // Menu
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0]);

  // Customize modal
  const [customizeItem, setCustomizeItem] = useState<MenuItem | null>(null);

  // Order queue
  const [queue, setQueue] = useState<QueueOrder[]>([]);
  const queuePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Submitting
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Loyalty
  const [loyaltyPhone, setLoyaltyPhone] = useState('');
  const [loyaltyMember, setLoyaltyMember] = useState<{ points: number; canRedeem: boolean; redeemValue: number; name: string | null } | null>(null);
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [loyaltyToast, setLoyaltyToast] = useState<string | null>(null);

  // Manual discount state
  const [discountType, setDiscountType] = useState<'PERCENT' | 'AMOUNT' | null>(null);
  const [discountValue, setDiscountValue] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [showDiscount, setShowDiscount] = useState(false);

  // Cash tender modal
  const [showCashModal, setShowCashModal] = useState(false);

  // Print settings
  const printerType = usePrintSettings((s) => s.printerType);
  const autoPrint = usePrintSettings((s) => s.autoPrint);
  const setPrinterType = usePrintSettings((s) => s.setPrinterType);
  const setAutoPrint = usePrintSettings((s) => s.setAutoPrint);
  const [showSettings, setShowSettings] = useState(false);

  // Retail coffee
  const [retailCoffees, setRetailCoffees] = useState<RetailCoffee[]>([]);
  const [retailPickerCoffee, setRetailPickerCoffee] = useState<RetailCoffee | null>(null);

  // Daily summary
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Cart store
  const items = useInStoreCartStore((s) => s.items);
  const customerName = useInStoreCartStore((s) => s.customerName);
  const addItem = useInStoreCartStore((s) => s.addItem);
  const removeItem = useInStoreCartStore((s) => s.removeItem);
  const updateQuantity = useInStoreCartStore((s) => s.updateQuantity);
  const setCustomerName = useInStoreCartStore((s) => s.setCustomerName);
  const clearCart = useInStoreCartStore((s) => s.clearCart);
  const getSubtotal = useInStoreCartStore((s) => s.getSubtotal);

  const subtotal = getSubtotal();
  const loyaltyDiscount =
    redeemPoints && loyaltyMember?.canRedeem ? loyaltyMember.redeemValue : 0;
  const afterLoyalty = Math.max(0, subtotal - loyaltyDiscount);
  const manualDiscountAmount = (() => {
    if (!discountType || !discountValue) return 0;
    const v = parseFloat(discountValue);
    if (Number.isNaN(v) || v <= 0) return 0;
    const raw = discountType === 'PERCENT' ? afterLoyalty * (v / 100) : v;
    return Math.round(Math.max(0, Math.min(raw, afterLoyalty)) * 100) / 100;
  })();
  const discountedSubtotal = Math.max(0, afterLoyalty - manualDiscountAmount);
  const tax = calculateTax(discountedSubtotal);
  const total = Math.round((discountedSubtotal + tax) * 100) / 100;

  // ---------- Fetch menu ----------
  useEffect(() => {
    let cancelled = false;
    async function fetchMenu() {
      try {
        const res = await fetch('/api/instore/menu');
        if (!res.ok) throw new Error('Failed to load menu');
        const data = await res.json();
        if (!cancelled) {
          setMenuItems(data.items ?? []);
          setMenuLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setMenuError(err instanceof Error ? err.message : 'Unknown error');
          setMenuLoading(false);
        }
      }
    }
    fetchMenu();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- Fetch retail coffees ----------
  useEffect(() => {
    let cancelled = false;
    async function fetchRetail() {
      try {
        const res = await fetch('/api/instore/retail');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setRetailCoffees(data.coffees ?? []);
      } catch {
        // Silently fail — retail is optional
      }
    }
    fetchRetail();
    return () => { cancelled = true; };
  }, []);

  // ---------- Poll queue ----------
  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/instore/orders?status=RECEIVED,IN_PROGRESS,READY');
      if (!res.ok) return;
      const data: QueueOrder[] = await res.json();
      setQueue(data.slice(0, 10));
    } catch {
      // Silently retry on next poll
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    queuePollRef.current = setInterval(fetchQueue, 5000);
    return () => {
      if (queuePollRef.current) clearInterval(queuePollRef.current);
    };
  }, [fetchQueue]);

  // ---------- Daily summary ----------
  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch('/api/instore/orders/summary');
      if (res.ok) {
        setSummary(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const toggleSummary = () => {
    const next = !showSummary;
    setShowSummary(next);
    if (next) fetchSummary();
  };

  // ---------- Loyalty lookup ----------
  const lookupLoyalty = async (phone: string) => {
    if (phone.replace(/\D/g, '').length < 10) { setLoyaltyMember(null); return; }
    try {
      const res = await fetch('/api/instore/loyalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name: customerName || undefined }),
      });
      if (res.ok) setLoyaltyMember(await res.json());
    } catch { /* ignore */ }
  };

  // ---------- Menu item tap ----------
  const handleMenuItemTap = (item: MenuItem) => {
    const hasCustomization =
      item.allowSizes ||
      item.allowMilk ||
      item.allowTemp ||
      item.addOns.length > 0 ||
      (item.modifierGroups?.length ?? 0) > 0;
    if (hasCustomization) {
      setCustomizeItem(item);
    } else {
      addItem({
        menuItemId: item.id,
        menuItemName: item.name,
        category: item.category,
        size: null,
        milkType: null,
        temperature: null,
        addOns: [],
        notes: '',
        unitPrice: item.basePrice,
        imageUrl: item.imageUrl,
      });
    }
  };

  // ---------- Retail package select ----------
  const handleRetailPackageSelect = (coffee: RetailCoffee, pkg: RetailPackage) => {
    addItem({
      menuItemId: coffee.menuItemId,
      menuItemName: coffee.name,
      category: 'RETAIL',
      size: null,
      milkType: null,
      temperature: null,
      addOns: [],
      notes: '',
      unitPrice: pkg.price,
      imageUrl: coffee.imageUrl,
      packageId: pkg.id,
      packageName: pkg.sizeDescription + (pkg.grindType ? ` (${pkg.grindType})` : ''),
    });
    setRetailPickerCoffee(null);
  };

  // ---------- Submit order ----------
  const submitOrder = async (
    paymentMethod: 'CASH' | 'CARD',
    opts?: { cashTendered?: number },
  ) => {
    if (items.length === 0) return;
    if (discountType && discountValue && !discountReason.trim()) {
      alert('Please add a reason for the discount before submitting.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        customerName: customerName || undefined,
        paymentMethod,
        source: 'POS' as const,
        loyaltyPhone: loyaltyPhone.replace(/\D/g, '').length >= 10 ? loyaltyPhone : undefined,
        redeemPoints: redeemPoints || undefined,
        cashTendered: opts?.cashTendered,
        manualDiscount:
          manualDiscountAmount > 0 && discountType
            ? {
                type: discountType,
                value: parseFloat(discountValue),
                reason: discountReason.trim(),
              }
            : undefined,
        items: items.map((ci) => ({
          menuItemId: ci.menuItemId,
          quantity: ci.quantity,
          size: ci.size,
          milkType: ci.milkType,
          temperature: ci.temperature,
          addOns: ci.addOns.map((a) => ({
            addOnId: a.addOnId,
            name: a.name,
            price: a.price,
          })),
          notes: ci.notes || undefined,
          packageId: ci.packageId || undefined,
        })),
      };

      const res = await fetch('/api/instore/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to create order' }));
        throw new Error(err.error || 'Failed to create order');
      }

      const order = await res.json();

      // Auto-print cup label
      if (autoPrint && printerType !== 'none' && order.id) {
        printCupLabel(order.id, printerType).catch((e) =>
          console.error('Label print failed:', e)
        );
      }

      // Show loyalty toast if points were earned
      if (order.loyaltyPointsEarned) {
        setLoyaltyToast(`+${order.loyaltyPointsEarned} pts earned!`);
        setTimeout(() => setLoyaltyToast(null), 3000);
      }

      // Reset loyalty state
      setLoyaltyPhone('');
      setLoyaltyMember(null);
      setRedeemPoints(false);

      // Reset discount state
      setDiscountType(null);
      setDiscountValue('');
      setDiscountReason('');
      setShowDiscount(false);

      clearCart();
      // Refresh queue immediately
      fetchQueue();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Mark cash order as paid ----------
  const markPaid = async (order: QueueOrder) => {
    if (
      !confirm(
        `Mark order #${order.displayNumber} as PAID? Confirms cash collected.`,
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/instore/orders/${order.id}/pay`, {
        method: 'POST',
      });
      if (res.ok) {
        setQueue((prev) =>
          prev.map((o) =>
            o.id === order.id ? { ...o, paymentStatus: 'PAID' } : o,
          ),
        );
      } else {
        const e = await res.json().catch(() => ({}));
        alert(e.error || 'Failed');
      }
    } catch {
      alert('Failed to mark paid');
    }
  };

  // ---------- Advance status ----------
  const advanceStatus = async (order: QueueOrder) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    try {
      const res = await fetch(`/api/instore/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) {
        setQueue((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, status: next } : o))
            .filter((o) => o.status !== 'PICKED_UP')
        );
      }
    } catch {
      // Silently fail; next poll will fix state
    }
  };

  // ---------- Print receipt ----------
  const printReceipt = async (orderId: string) => {
    const format = printerType === 'receipt' ? 'receipt' : 'standard';
    const res = await fetch(`/api/instore/orders/${orderId}/receipt?format=${format}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      iframe.contentWindow?.print();
      setTimeout(() => { document.body.removeChild(iframe); URL.revokeObjectURL(url); }, 5000);
    };
  };

  // ---------- Filtered menu ----------
  const filteredItems = useMemo(
    () => menuItems.filter((i) => i.category.toLowerCase() === activeCategory.toLowerCase()),
    [menuItems, activeCategory]
  );

  // ---------- Render ----------
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Main area: menu + order panel */}
      <div className="flex min-h-0 flex-1">
        {/* ---- LEFT: Menu grid (60%) ---- */}
        <div className="flex w-[60%] flex-col border-r border-neutral-800">
          {/* Category tabs */}
          <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-neutral-800 bg-neutral-900 px-3 py-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`min-h-[48px] shrink-0 rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
                  activeCategory === cat
                    ? 'bg-emerald-600 text-white'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                {cat}
              </button>
            ))}
            <div className="ml-auto flex shrink-0 gap-1">
              <button
                onClick={toggleSummary}
                className={`min-h-[48px] rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  showSummary
                    ? 'bg-emerald-600 text-white'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                }`}
                title="Daily summary"
              >
                Today
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="min-h-[48px] rounded-lg bg-neutral-800 px-4 py-2 text-neutral-400 hover:bg-neutral-700 hover:text-white transition-colors"
                title="Print settings"
              >
                &#9881;
              </button>
            </div>
          </div>

          {/* Print settings panel */}
          {showSettings && (
            <div className="border-b border-neutral-800 bg-neutral-900/95 px-4 py-3 flex items-center gap-6 text-sm">
              <span className="text-neutral-400 font-medium">Printer:</span>
              {(['none', 'thermal', 'receipt'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setPrinterType(type)}
                  className={`min-h-[40px] rounded-lg px-4 py-1.5 font-medium transition-colors ${
                    printerType === type
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  {type === 'none' ? 'Off' : type === 'thermal' ? 'Thermal Label' : 'Receipt'}
                </button>
              ))}
              <div className="ml-4 flex items-center gap-2">
                <span className="text-neutral-400">Auto-print:</span>
                <button
                  onClick={() => setAutoPrint(!autoPrint)}
                  className={`min-h-[40px] rounded-lg px-4 py-1.5 font-medium transition-colors ${
                    autoPrint
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  {autoPrint ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          )}

          {/* Daily summary panel */}
          {showSummary && (
            <div className="border-b border-neutral-800 bg-neutral-900/95 px-4 py-4">
              {summaryLoading && !summary ? (
                <div className="flex items-center justify-center py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-600 border-t-emerald-500" />
                </div>
              ) : summary ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">Today&apos;s Summary</h3>
                    <button
                      onClick={fetchSummary}
                      className="text-xs text-neutral-400 hover:text-white transition-colors"
                    >
                      Refresh
                    </button>
                  </div>
                  {/* Revenue row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-neutral-800 p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-400">${summary.totalRevenue.toFixed(2)}</p>
                      <p className="text-[10px] uppercase text-neutral-500 mt-1">Total Revenue</p>
                    </div>
                    <div className="rounded-lg bg-neutral-800 p-3 text-center">
                      <p className="text-2xl font-bold text-white">{summary.totalOrders}</p>
                      <p className="text-[10px] uppercase text-neutral-500 mt-1">Orders</p>
                    </div>
                    <div className="rounded-lg bg-neutral-800 p-3 text-center">
                      <p className="text-2xl font-bold text-white">${summary.avgOrderValue.toFixed(2)}</p>
                      <p className="text-[10px] uppercase text-neutral-500 mt-1">Avg Order</p>
                    </div>
                  </div>
                  {/* Breakdown row */}
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-neutral-800/60 p-2">
                      <p className="text-sm font-bold text-amber-400">{summary.cashCount}</p>
                      <p className="text-neutral-500">Cash</p>
                      <p className="text-neutral-400">${summary.cashRevenue.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg bg-neutral-800/60 p-2">
                      <p className="text-sm font-bold text-blue-400">{summary.cardCount}</p>
                      <p className="text-neutral-500">Card</p>
                      <p className="text-neutral-400">${summary.cardRevenue.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg bg-neutral-800/60 p-2">
                      <p className="text-sm font-bold text-white">{summary.kioskOrders}</p>
                      <p className="text-neutral-500">Kiosk</p>
                    </div>
                    <div className="rounded-lg bg-neutral-800/60 p-2">
                      <p className="text-sm font-bold text-white">{summary.posOrders}</p>
                      <p className="text-neutral-500">POS</p>
                    </div>
                  </div>
                  {/* Status row */}
                  <div className="flex gap-4 text-xs text-neutral-400 justify-center">
                    <span><span className="text-emerald-400 font-semibold">{summary.completedOrders}</span> completed</span>
                    <span><span className="text-amber-400 font-semibold">{summary.activeOrders}</span> active</span>
                    {summary.cancelledOrders > 0 && (
                      <span><span className="text-red-400 font-semibold">{summary.cancelledOrders}</span> cancelled</span>
                    )}
                    <span><span className="text-white font-semibold">{summary.totalItems}</span> items sold</span>
                    <span>Tax: ${summary.totalTax.toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-neutral-500 text-center">Failed to load summary</p>
              )}
            </div>
          )}

          {/* Menu items */}
          <div className="flex-1 overflow-y-auto p-3">
            {menuLoading && (
              <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-600 border-t-emerald-500" />
              </div>
            )}
            {menuError && (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-red-400">
                <p className="text-sm">{menuError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-lg bg-neutral-800 px-4 py-2 text-sm hover:bg-neutral-700"
                >
                  Retry
                </button>
              </div>
            )}
            {activeCategory === 'Coffee' ? (
              /* ---- Retail coffee grid ---- */
              retailCoffees.length === 0 ? (
                <p className="py-12 text-center text-sm text-neutral-500">
                  No retail coffees available.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 xl:grid-cols-4">
                  {retailCoffees.map((coffee) => {
                    const minPrice = Math.min(...coffee.packages.map((p) => p.price));
                    const maxPrice = Math.max(...coffee.packages.map((p) => p.price));
                    return (
                      <button
                        key={coffee.id}
                        onClick={() => setRetailPickerCoffee(coffee)}
                        className="relative flex min-h-[80px] flex-col justify-between rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-left transition-colors hover:border-neutral-600 hover:bg-neutral-800 active:bg-neutral-700"
                      >
                        <span className="text-sm font-semibold leading-tight text-white">
                          {coffee.name}
                        </span>
                        <div className="mt-1">
                          {coffee.origin && (
                            <span className="text-[11px] text-neutral-500 block">{coffee.origin}</span>
                          )}
                          <span className="text-xs font-medium text-emerald-400">
                            ${minPrice.toFixed(2)}
                            {maxPrice > minPrice && (
                              <span className="text-neutral-500"> &ndash; ${maxPrice.toFixed(2)}</span>
                            )}
                          </span>
                        </div>
                        <span className="absolute top-2 right-2 rounded bg-neutral-700 px-1.5 py-0.5 text-[10px] font-medium text-neutral-300">
                          {coffee.packages.length} pkg{coffee.packages.length !== 1 ? 's' : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )
            ) : (
              /* ---- Standard menu items grid ---- */
              <>
                {!menuLoading && !menuError && filteredItems.length === 0 && (
                  <p className="py-12 text-center text-sm text-neutral-500">
                    No items in this category.
                  </p>
                )}
                <div className="grid grid-cols-3 gap-2 xl:grid-cols-4">
                  {filteredItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { if (item.available) handleMenuItemTap(item); }}
                      className={`relative flex min-h-[80px] flex-col justify-between rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-left transition-colors ${
                        item.available
                          ? 'hover:border-neutral-600 hover:bg-neutral-800 active:bg-neutral-700'
                          : 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {!item.available && (
                        <span className="absolute top-2 right-2 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                          OUT
                        </span>
                      )}
                      <span className="text-sm font-semibold leading-tight text-white">
                        {item.name}
                      </span>
                      <span className="mt-1 text-xs font-medium text-emerald-400">
                        ${item.basePrice.toFixed(2)}
                        {item.allowSizes && item.largePrice != null && (
                          <span className="text-neutral-500"> &ndash; ${item.largePrice.toFixed(2)}</span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ---- RIGHT: Order panel (40%) ---- */}
        <div className="flex w-[40%] flex-col bg-neutral-900">
          {/* Customer name + loyalty phone */}
          <div className="shrink-0 border-b border-neutral-800 px-4 py-3 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Customer name (optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-emerald-500"
              />
              <input
                type="tel"
                placeholder="Phone # for rewards"
                value={loyaltyPhone}
                onChange={(e) => {
                  setLoyaltyPhone(e.target.value);
                  lookupLoyalty(e.target.value);
                }}
                className="w-40 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-emerald-500"
              />
            </div>
            {loyaltyMember && (
              <div className="flex items-center gap-2 text-sm">
                <span className="rounded-full bg-emerald-600/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                  {loyaltyMember.points} pts
                </span>
                {loyaltyMember.name && (
                  <span className="text-xs text-neutral-400">{loyaltyMember.name}</span>
                )}
                {loyaltyMember.canRedeem && (
                  <button
                    onClick={() => setRedeemPoints(!redeemPoints)}
                    className={`ml-auto rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                      redeemPoints
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-800 text-emerald-400 hover:bg-neutral-700'
                    }`}
                  >
                    Redeem {loyaltyMember.points} pts (${loyaltyMember.redeemValue.toFixed(2)} off)
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Order items */}
          <div className="flex-1 overflow-y-auto px-4 py-2">
            {items.length === 0 ? (
              <p className="py-12 text-center text-sm text-neutral-500">
                Tap menu items to build an order.
              </p>
            ) : (
              <ul className="space-y-1">
                {items.map((ci) => (
                  <li
                    key={ci.id}
                    className="flex items-start gap-2 rounded-lg border border-neutral-800 bg-neutral-950 p-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white">{ci.menuItemName}</p>
                      <div className="mt-0.5 flex flex-wrap gap-1.5 text-[11px] text-neutral-400">
                        {ci.packageName && <span>{ci.packageName}</span>}
                        {ci.size && <span>{ci.size}</span>}
                        {ci.milkType && ci.milkType !== 'NONE' && <span>{ci.milkType}</span>}
                        {ci.temperature && <span>{ci.temperature}</span>}
                        {ci.addOns.map((a) => (
                          <span key={a.addOnId}>+{a.name}</span>
                        ))}
                      </div>
                      {ci.notes && (
                        <p className="mt-0.5 text-[11px] italic text-neutral-500">{ci.notes}</p>
                      )}
                    </div>
                    {/* Qty controls */}
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => updateQuantity(ci.id, ci.quantity - 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-800 text-sm font-bold text-neutral-300 hover:bg-neutral-700"
                        aria-label="Decrease quantity"
                      >
                        &minus;
                      </button>
                      <span className="w-6 text-center text-sm font-semibold text-white">
                        {ci.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(ci.id, ci.quantity + 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-800 text-sm font-bold text-neutral-300 hover:bg-neutral-700"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    {/* Line price */}
                    <span className="shrink-0 text-sm font-semibold text-white">
                      ${(ci.unitPrice * ci.quantity).toFixed(2)}
                    </span>
                    {/* Remove */}
                    <button
                      onClick={() => removeItem(ci.id)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-red-900/50 hover:text-red-400"
                      aria-label="Remove item"
                    >
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Totals + payment */}
          <div className="shrink-0 border-t border-neutral-800 px-4 py-3">
            {submitError && (
              <p className="mb-2 rounded-lg bg-red-900/40 px-3 py-2 text-xs text-red-300">
                {submitError}
              </p>
            )}
            {/* Manual discount controls */}
            {items.length > 0 && (
              <div className="mb-3">
                {!showDiscount && !manualDiscountAmount && (
                  <button
                    onClick={() => setShowDiscount(true)}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-400 hover:bg-neutral-800"
                  >
                    + Add discount
                  </button>
                )}
                {(showDiscount || manualDiscountAmount > 0) && (
                  <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-2 space-y-2">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setDiscountType('PERCENT')}
                        className={`flex-1 rounded px-2 py-1 text-xs font-semibold ${
                          discountType === 'PERCENT'
                            ? 'bg-amber-600 text-white'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        % off
                      </button>
                      <button
                        onClick={() => setDiscountType('AMOUNT')}
                        className={`flex-1 rounded px-2 py-1 text-xs font-semibold ${
                          discountType === 'AMOUNT'
                            ? 'bg-amber-600 text-white'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        $ off
                      </button>
                      <button
                        onClick={() => {
                          setDiscountType(null);
                          setDiscountValue('');
                          setDiscountReason('');
                          setShowDiscount(false);
                        }}
                        className="rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-500 hover:bg-red-900/40 hover:text-red-400"
                        aria-label="Clear discount"
                      >
                        ✕
                      </button>
                    </div>
                    {discountType && (
                      <>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          inputMode="decimal"
                          placeholder={discountType === 'PERCENT' ? '10' : '2.00'}
                          value={discountValue}
                          onChange={(e) => setDiscountValue(e.target.value)}
                          className="w-full rounded bg-neutral-800 border border-neutral-700 px-2 py-1 text-sm text-white"
                        />
                        <input
                          type="text"
                          placeholder="Reason (required)"
                          value={discountReason}
                          onChange={(e) => setDiscountReason(e.target.value)}
                          className="w-full rounded bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs text-white"
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="mb-3 space-y-1 text-sm">
              <div className="flex justify-between text-neutral-400">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {loyaltyDiscount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Loyalty redemption</span>
                  <span>−${loyaltyDiscount.toFixed(2)}</span>
                </div>
              )}
              {manualDiscountAmount > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Discount{discountReason && ` — ${discountReason}`}</span>
                  <span>−${manualDiscountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-neutral-400">
                <span>Tax (8%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-white">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={items.length === 0 || submitting}
                onClick={() => setShowCashModal(true)}
                className="flex min-h-[52px] items-center justify-center rounded-xl bg-amber-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-amber-500 active:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  '💵 Cash'
                )}
              </button>
              <button
                disabled={items.length === 0 || submitting}
                onClick={() => submitOrder('CARD')}
                className="flex min-h-[52px] items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-500 active:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  '💳 Card'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---- BOTTOM: Order queue bar ---- */}
      <div className="shrink-0 border-t border-neutral-800 bg-neutral-900">
        <div className="flex items-center gap-3 overflow-x-auto px-4 py-2">
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Queue
          </span>
          {queue.length === 0 && (
            <span className="text-xs text-neutral-600">No active orders</span>
          )}
          {queue.map((order) => {
            const isUnpaid = order.paymentStatus === 'PENDING';
            return (
              <div
                key={order.id}
                className={`flex shrink-0 items-center gap-1 ${
                  isUnpaid ? 'rounded-xl ring-2 ring-amber-500/60' : ''
                }`}
              >
                {isUnpaid && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markPaid(order);
                    }}
                    className="flex min-h-[48px] items-center gap-1 rounded-l-xl bg-amber-500 px-3 py-2 text-sm font-bold text-amber-950 hover:bg-amber-400 active:bg-amber-600"
                    title="Mark cash as collected"
                  >
                    💵 Mark Paid
                  </button>
                )}
                <button
                  onClick={() => advanceStatus(order)}
                  className={`flex min-h-[48px] items-center gap-2 px-4 py-2 transition-colors ${
                    STATUS_COLORS[order.status]
                  } hover:brightness-110 active:brightness-90 ${
                    isUnpaid ? '' : 'rounded-l-xl'
                  }`}
                  title={`Tap to advance status`}
                >
                  <span className="text-sm font-bold">#{order.displayNumber}</span>
                  <span className="text-xs opacity-80">
                    {order.customerName || 'Guest'}
                  </span>
                  <span className="rounded-md bg-black/20 px-2 py-0.5 text-[10px] font-semibold uppercase">
                    {STATUS_LABELS[order.status]}
                  </span>
                </button>
                {printerType !== 'none' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      printCupLabel(order.id, printerType);
                    }}
                    className="flex min-h-[48px] items-center bg-neutral-700 px-3 py-2 text-neutral-300 hover:bg-neutral-600 hover:text-white transition-colors"
                    title="Reprint label"
                  >
                    &#9113;
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    printReceipt(order.id);
                  }}
                  className={`flex min-h-[48px] items-center rounded-r-xl bg-neutral-700 px-3 py-2 text-neutral-300 hover:bg-neutral-600 hover:text-white transition-colors ${
                    printerType === 'none' ? '' : 'border-l border-neutral-600'
                  }`}
                  title="Print receipt"
                >
                  R
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---- Cash tender modal ---- */}
      {showCashModal && (
        <CashTenderModal
          total={total}
          submitting={submitting}
          onClose={() => setShowCashModal(false)}
          onConfirm={async (tendered) => {
            setShowCashModal(false);
            await submitOrder('CASH', { cashTendered: tendered });
          }}
        />
      )}

      {/* ---- Customize modal ---- */}
      {customizeItem && (
        <CustomizeModal
          item={customizeItem}
          onAdd={addItem}
          onClose={() => setCustomizeItem(null)}
        />
      )}

      {/* ---- Retail package picker modal ---- */}
      {retailPickerCoffee && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setRetailPickerCoffee(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-neutral-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{retailPickerCoffee.name}</h2>
                {retailPickerCoffee.origin && (
                  <p className="mt-0.5 text-sm text-neutral-400">{retailPickerCoffee.origin} &middot; {retailPickerCoffee.roastLevel}</p>
                )}
                {retailPickerCoffee.description && (
                  <p className="mt-1 text-sm text-neutral-500">{retailPickerCoffee.description}</p>
                )}
              </div>
              <button
                onClick={() => setRetailPickerCoffee(null)}
                className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-800 hover:text-white"
                aria-label="Close"
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">
                Select Package
              </p>
              {retailPickerCoffee.packages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => handleRetailPackageSelect(retailPickerCoffee, pkg)}
                  className="flex min-h-[52px] w-full items-center justify-between rounded-xl border-2 border-neutral-700 bg-neutral-800 px-4 py-3 text-left transition-colors hover:border-emerald-500 hover:bg-emerald-500/10 active:bg-emerald-500/20"
                >
                  <div>
                    <span className="text-sm font-semibold text-white">{pkg.sizeDescription}</span>
                    {pkg.grindType && (
                      <span className="ml-2 text-xs text-neutral-400">{pkg.grindType}</span>
                    )}
                    <span className="ml-2 rounded bg-neutral-700 px-1.5 py-0.5 text-[10px] font-medium text-neutral-300">
                      {pkg.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-emerald-400">
                    ${pkg.price.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---- Loyalty toast ---- */}
      {loyaltyToast && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg animate-in fade-in slide-in-from-bottom-4">
          {loyaltyToast}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cash Tender Modal — mimics real-POS cash collection flow
// ---------------------------------------------------------------------------

function CashTenderModal({
  total,
  submitting,
  onConfirm,
  onClose,
}: {
  total: number;
  submitting: boolean;
  onConfirm: (tendered: number) => Promise<void> | void;
  onClose: () => void;
}) {
  const [raw, setRaw] = useState<string>('');
  const tendered = raw === '' ? 0 : parseFloat(raw);
  const valid = !Number.isNaN(tendered) && tendered >= total;
  const change = valid ? Math.max(0, Math.round((tendered - total) * 100) / 100) : 0;

  // Quick-tender suggestions: exact total + the next $5 / $10 / $20 / $50
  const exact = Math.ceil(total * 100) / 100;
  const next5 = Math.ceil(total / 5) * 5;
  const next10 = Math.ceil(total / 10) * 10;
  const next20 = Math.ceil(total / 20) * 20;
  const quickAmounts = Array.from(
    new Set([exact, next5, next10, next20, 50, 100].filter((v) => v >= exact)),
  ).slice(0, 6);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-neutral-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white">Cash Payment</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Total due: <span className="font-bold text-white">${total.toFixed(2)}</span>
          </p>
        </div>

        <label className="block text-sm">
          <span className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">
            Amount tendered
          </span>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-neutral-500">
              $
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              autoFocus
              inputMode="decimal"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 pl-7 pr-3 py-3 text-2xl font-bold text-white outline-none focus:border-amber-500"
            />
          </div>
        </label>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {quickAmounts.map((amt) => (
            <button
              key={amt}
              onClick={() => setRaw(amt.toFixed(2))}
              className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm font-semibold text-neutral-200 hover:border-amber-500 hover:bg-amber-500/10"
            >
              {amt === exact ? 'Exact' : `$${amt}`}
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-neutral-800 bg-neutral-950/60 p-4">
          <div className="flex justify-between text-sm text-neutral-400">
            <span>Tendered</span>
            <span>${valid ? tendered.toFixed(2) : '—'}</span>
          </div>
          <div className="flex justify-between text-sm text-neutral-400">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-neutral-800 pt-2 text-lg font-bold">
            <span className="text-white">Change due</span>
            <span className={valid ? 'text-emerald-400' : 'text-neutral-600'}>
              ${valid ? change.toFixed(2) : '0.00'}
            </span>
          </div>
        </div>

        {!valid && raw !== '' && (
          <p className="mt-3 rounded-lg bg-red-900/30 border border-red-900 px-3 py-2 text-xs text-red-300">
            Tendered amount must be at least ${total.toFixed(2)}.
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            onClick={onClose}
            className="rounded-xl bg-neutral-800 px-4 py-3 text-sm font-semibold text-neutral-200 hover:bg-neutral-700"
          >
            Cancel
          </button>
          <button
            disabled={!valid || submitting}
            onClick={() => onConfirm(tendered)}
            className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-amber-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? 'Processing…' : `Confirm · $${change.toFixed(2)} change`}
          </button>
        </div>
      </div>
    </div>
  );
}
