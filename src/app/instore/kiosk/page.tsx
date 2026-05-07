'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useInStoreCartStore, type InStoreCartItem, type InStoreAddOn } from '@/lib/instore/cart-store';
import { calculateTax } from '@/lib/instore/tax';
import { usePrintSettings, printCupLabel } from '@/lib/instore/print-settings';
import { useTheme } from '@/components/ThemeContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step = 'welcome' | 'menu' | 'customize' | 'cart' | 'confirmation';

type Category = 'ESPRESSO' | 'DRIP' | 'COLD' | 'TEA' | 'FOOD';

interface MenuAddOn {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  basePrice: number;
  mediumPrice: number | null;
  largePrice: number | null;
  imageUrl: string | null;
  allowSizes: boolean;
  allowMilk: boolean;
  allowTemp: boolean;
  available: boolean;
  addOns: MenuAddOn[];
}

interface PlacedOrder {
  id: string;
  orderNumber: string;
  displayNumber: number;
  customerName: string | null;
  subtotal: number;
  tax: number;
  total: number;
  items: Array<{
    menuItem: { name: string; category: string };
    quantity: number;
    size: string | null;
  }>;
}

type Size = 'SMALL' | 'MEDIUM' | 'LARGE';

type MilkType = 'WHOLE' | 'TWO_PERCENT' | 'OAT' | 'ALMOND' | 'SOY' | 'COCONUT' | 'NONE';

const MILK_OPTIONS: { value: MilkType; label: string }[] = [
  { value: 'NONE', label: 'None' },
  { value: 'WHOLE', label: 'Whole' },
  { value: 'TWO_PERCENT', label: '2%' },
  { value: 'OAT', label: 'Oat' },
  { value: 'ALMOND', label: 'Almond' },
  { value: 'SOY', label: 'Soy' },
  { value: 'COCONUT', label: 'Coconut' },
];

const CATEGORY_META: Record<Category, { label: string; emoji: string }> = {
  ESPRESSO: { label: 'Espresso', emoji: '☕' },
  DRIP: { label: 'Drip', emoji: '🫖' },
  COLD: { label: 'Cold', emoji: '🧊' },
  TEA: { label: 'Tea', emoji: '🍵' },
  FOOD: { label: 'Food', emoji: '🥐' },
};

const CATEGORIES: Category[] = ['ESPRESSO', 'DRIP', 'COLD', 'TEA', 'FOOD'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(cents: number): string {
  return `$${cents.toFixed(2)}`;
}

function getSizePrice(item: MenuItem, size: Size): number {
  if (size === 'MEDIUM' && item.mediumPrice != null) return item.mediumPrice;
  if (size === 'LARGE' && item.largePrice != null) return item.largePrice;
  return item.basePrice;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function KioskPage() {
  const theme = useTheme();
  // --- Global state ---
  const cart = useInStoreCartStore();

  // --- Local state ---
  const [step, setStep] = useState<Step>('welcome');
  const [transitioning, setTransitioning] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category>('ESPRESSO');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  // Customize form state
  const [customSize, setCustomSize] = useState<Size>('SMALL');
  const [customMilk, setCustomMilk] = useState<MilkType>('NONE');
  const [customTemp, setCustomTemp] = useState<'HOT' | 'ICED'>('HOT');
  const [customAddOns, setCustomAddOns] = useState<Set<string>>(new Set());
  const [customNotes, setCustomNotes] = useState('');

  // Loyalty
  const [loyaltyPhone, setLoyaltyPhone] = useState('');
  const [loyaltyMember, setLoyaltyMember] = useState<{ points: number; canRedeem: boolean; redeemValue: number; name: string | null } | null>(null);
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [loyaltyPointsEarned, setLoyaltyPointsEarned] = useState<number | null>(null);
  const [loyaltyNewBalance, setLoyaltyNewBalance] = useState<number | null>(null);

  // Order result
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);
  const [countdown, setCountdown] = useState(15);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Fetch menu on mount ---
  useEffect(() => {
    async function fetchMenu() {
      try {
        const res = await fetch('/api/instore/menu');
        if (!res.ok) throw new Error('Menu fetch failed');
        const data = await res.json();
        setMenuItems(data.items ?? []);
      } catch {
        console.error('Failed to load menu');
      } finally {
        setMenuLoading(false);
      }
    }
    fetchMenu();
  }, []);

  // --- Loyalty lookup ---
  const lookupLoyalty = async (phone: string) => {
    if (phone.replace(/\D/g, '').length < 10) { setLoyaltyMember(null); return; }
    try {
      const res = await fetch('/api/instore/loyalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name: cart.customerName || undefined }),
      });
      if (res.ok) setLoyaltyMember(await res.json());
    } catch { /* ignore */ }
  };

  // --- Step transition helper ---
  const goTo = useCallback(
    (next: Step) => {
      setTransitioning(true);
      setTimeout(() => {
        setStep(next);
        setTransitioning(false);
      }, 200);
    },
    [],
  );

  // --- Confirmation auto-reset ---
  useEffect(() => {
    if (step !== 'confirmation') return;
    setCountdown(15);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          cart.clearCart();
          setLoyaltyPointsEarned(null);
          setLoyaltyNewBalance(null);
          goTo('welcome');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // --- Derived data ---
  const categoryItems = menuItems.filter((i) => i.category === selectedCategory);
  const subtotal = cart.getSubtotal();
  const itemCount = cart.getItemCount();
  const tax = calculateTax(subtotal);
  const total = Math.round((subtotal + tax) * 100) / 100;

  // --- Customize helpers ---
  function openCustomize(item: MenuItem) {
    setSelectedItem(item);
    setCustomSize('SMALL');
    setCustomMilk('NONE');
    setCustomTemp('HOT');
    setCustomAddOns(new Set());
    setCustomNotes('');
    goTo('customize');
  }

  function getCustomizeUnitPrice(): number {
    if (!selectedItem) return 0;
    const base = selectedItem.allowSizes ? getSizePrice(selectedItem, customSize) : selectedItem.basePrice;
    const addOnTotal = selectedItem.addOns
      .filter((a) => customAddOns.has(a.id))
      .reduce((sum, a) => sum + a.price, 0);
    return Math.round((base + addOnTotal) * 100) / 100;
  }

  function handleAddToCart() {
    if (!selectedItem) return;
    const addOns: InStoreAddOn[] = selectedItem.addOns
      .filter((a) => customAddOns.has(a.id))
      .map((a) => ({ addOnId: a.id, name: a.name, price: a.price }));

    cart.addItem({
      menuItemId: selectedItem.id,
      menuItemName: selectedItem.name,
      category: selectedItem.category,
      size: selectedItem.allowSizes ? customSize : null,
      milkType: selectedItem.allowMilk ? customMilk : null,
      temperature: selectedItem.allowTemp ? customTemp : null,
      addOns,
      notes: customNotes,
      unitPrice: getCustomizeUnitPrice(),
      imageUrl: selectedItem.imageUrl,
    });
    goTo('menu');
  }

  function handleAddFoodDirect(item: MenuItem) {
    cart.addItem({
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

  async function handlePlaceOrder() {
    if (placing || cart.items.length === 0) return;
    setPlacing(true);
    setPlaceError(null);

    try {
      const payload = {
        customerName: cart.customerName || undefined,
        loyaltyPhone: loyaltyPhone.replace(/\D/g, '').length >= 10 ? loyaltyPhone : undefined,
        redeemPoints: redeemPoints || undefined,
        items: cart.items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          size: item.size,
          milkType: item.milkType,
          temperature: item.temperature,
          addOns: item.addOns,
          notes: item.notes || undefined,
          packageId: item.packageId || undefined,
        })),
        paymentMethod: 'CASH' as const,
        source: 'KIOSK' as const,
      };

      const res = await fetch('/api/instore/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to place order');
      }

      const order = await res.json();
      setPlacedOrder(order as PlacedOrder);

      // Store loyalty info for confirmation screen
      if (order.loyaltyPointsEarned) {
        setLoyaltyPointsEarned(order.loyaltyPointsEarned);
        setLoyaltyNewBalance(order.loyaltyNewBalance ?? null);
      }

      // Reset loyalty state
      setLoyaltyPhone('');
      setLoyaltyMember(null);
      setRedeemPoints(false);

      // Auto-print cup label if configured
      const { printerType, autoPrint } = usePrintSettings.getState();
      if (autoPrint && printerType !== 'none' && order.id) {
        printCupLabel(order.id, printerType).catch((e) =>
          console.error('Label print failed:', e)
        );
      }

      goTo('confirmation');
    } catch (err) {
      setPlaceError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setPlacing(false);
    }
  }

  // --- Shared transition class ---
  const transitionClass = transitioning
    ? 'opacity-0 translate-y-4'
    : 'opacity-100 translate-y-0';

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-neutral-950 text-white select-none">
      {/* ----------------------------------------------------------------- */}
      {/* STEP 1: WELCOME */}
      {/* ----------------------------------------------------------------- */}
      {step === 'welcome' && (
        <div
          className={`flex min-h-screen flex-col items-center justify-center px-6 transition-all duration-300 ease-out ${transitionClass}`}
        >
          <h1 className="mb-2 font-display text-5xl font-bold tracking-tight sm:text-6xl">
            <span className="text-accent-400">{theme.brand.wordmark.lead}</span>{' '}
            <span className="text-ink">{theme.brand.wordmark.middle}</span>{' '}
            <span className="text-ink-dark">{theme.brand.wordmark.trail}</span>
          </h1>
          <p className="mb-14 text-lg text-ink-dark/70 font-mono uppercase tracking-[0.3em]">
            {theme.brand.tagline}
          </p>
          <button
            onClick={() => {
              cart.clearCart();
              goTo('menu');
            }}
            className="group relative rounded-2xl bg-accent-500 px-16 py-6 text-2xl font-display font-semibold text-surface-950 shadow-lg shadow-accent-500/30 transition-all hover:bg-accent-400 hover:shadow-accent-500/50 active:scale-95"
          >
            <span className="relative z-10">{theme.brand.startOrderLabel}</span>
            <span className="absolute inset-0 animate-pulse rounded-2xl bg-amber-400/30 blur-xl" />
          </button>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* STEP 2: MENU */}
      {/* ----------------------------------------------------------------- */}
      {step === 'menu' && (
        <div
          className={`flex min-h-screen flex-col transition-all duration-300 ease-out ${transitionClass}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
            <h2 className="text-2xl font-bold text-amber-400">Menu</h2>
            <button
              onClick={() => goTo('welcome')}
              className="rounded-xl bg-neutral-800 px-4 py-2 text-sm text-neutral-300 transition hover:bg-neutral-700"
            >
              Cancel
            </button>
          </div>

          {/* Category tiles */}
          <div className="flex gap-3 overflow-x-auto px-6 py-4">
            {CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat];
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex min-w-[100px] flex-col items-center gap-1 rounded-2xl px-5 py-4 text-base font-medium transition-all ${
                    isActive
                      ? 'bg-amber-500 text-neutral-950 shadow-lg shadow-amber-500/25'
                      : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                  }`}
                >
                  <span className="text-3xl">{meta.emoji}</span>
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>

          {/* Menu grid */}
          <div className="flex-1 overflow-y-auto px-6 pb-28">
            {menuLoading ? (
              <div className="flex items-center justify-center py-20 text-neutral-500">
                Loading menu...
              </div>
            ) : categoryItems.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-neutral-500">
                No items in this category
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {categoryItems.map((item) => {
                  const needsCustomize =
                    item.allowSizes || item.allowMilk || item.allowTemp || item.addOns.length > 0;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (!item.available) return;
                        if (needsCustomize) {
                          openCustomize(item);
                        } else {
                          handleAddFoodDirect(item);
                        }
                      }}
                      className={`relative flex flex-col rounded-2xl bg-neutral-900 p-5 text-left transition-all ${
                        item.available
                          ? 'hover:bg-neutral-800 hover:shadow-lg active:scale-[0.98]'
                          : 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {!item.available && (
                        <span className="mb-2 text-sm font-bold text-red-400">Sold Out</span>
                      )}
                      <span className="mb-2 text-xl font-semibold leading-tight">
                        {item.name}
                      </span>
                      {item.description && (
                        <span className="mb-3 line-clamp-2 text-sm leading-snug text-neutral-400">
                          {item.description}
                        </span>
                      )}
                      <span className="mt-auto text-lg font-bold text-amber-400">
                        {formatPrice(item.basePrice)}
                        {item.allowSizes && '+'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom cart bar */}
          {itemCount > 0 && (
            <div className="fixed inset-x-0 bottom-0 border-t border-neutral-800 bg-neutral-950/95 px-6 py-4 backdrop-blur-sm">
              <button
                onClick={() => goTo('cart')}
                className="flex w-full items-center justify-between rounded-2xl bg-amber-500 px-6 py-4 text-lg font-semibold text-neutral-950 transition hover:bg-amber-400 active:scale-[0.98]"
              >
                <span>
                  View Cart ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                </span>
                <span>{formatPrice(subtotal)}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* STEP 3: CUSTOMIZE */}
      {/* ----------------------------------------------------------------- */}
      {step === 'customize' && selectedItem && (
        <div
          className={`flex min-h-screen flex-col transition-all duration-300 ease-out ${transitionClass}`}
        >
          {/* Header */}
          <div className="flex items-center gap-4 border-b border-neutral-800 px-6 py-4">
            <button
              onClick={() => goTo('menu')}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-800 text-xl transition hover:bg-neutral-700"
              aria-label="Back"
            >
              ←
            </button>
            <h2 className="text-2xl font-bold">{selectedItem.name}</h2>
          </div>

          <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6 pb-32">
            {/* Size selector */}
            {selectedItem.allowSizes && (
              <div>
                <h3 className="mb-3 text-lg font-semibold text-neutral-300">Size</h3>
                <div className="grid grid-cols-3 gap-3">
                  {(['SMALL', 'MEDIUM', 'LARGE'] as Size[]).map((size) => {
                    const price = getSizePrice(selectedItem, size);
                    const labels: Record<Size, string> = {
                      SMALL: 'S',
                      MEDIUM: 'M',
                      LARGE: 'L',
                    };
                    const isSelected = customSize === size;
                    return (
                      <button
                        key={size}
                        onClick={() => setCustomSize(size)}
                        className={`flex flex-col items-center gap-1 rounded-2xl py-5 text-lg font-semibold transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-neutral-950 shadow-lg shadow-amber-500/25'
                            : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                        }`}
                      >
                        <span className="text-2xl">{labels[size]}</span>
                        <span className="text-sm font-medium">
                          {formatPrice(price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Milk type */}
            {selectedItem.allowMilk && (
              <div>
                <h3 className="mb-3 text-lg font-semibold text-neutral-300">Milk</h3>
                <div className="grid grid-cols-4 gap-3">
                  {MILK_OPTIONS.map((option) => {
                    const isSelected = customMilk === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setCustomMilk(option.value)}
                        className={`rounded-2xl py-4 text-base font-medium transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-neutral-950 shadow-lg shadow-amber-500/25'
                            : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Hot / Iced toggle */}
            {selectedItem.allowTemp && (
              <div>
                <h3 className="mb-3 text-lg font-semibold text-neutral-300">Temperature</h3>
                <div className="grid grid-cols-2 gap-3">
                  {(['HOT', 'ICED'] as const).map((temp) => {
                    const isSelected = customTemp === temp;
                    return (
                      <button
                        key={temp}
                        onClick={() => setCustomTemp(temp)}
                        className={`rounded-2xl py-5 text-lg font-semibold transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-neutral-950 shadow-lg shadow-amber-500/25'
                            : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                        }`}
                      >
                        {temp === 'HOT' ? '🔥 Hot' : '🧊 Iced'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add-ons */}
            {selectedItem.addOns.length > 0 && (
              <div>
                <h3 className="mb-3 text-lg font-semibold text-neutral-300">Add-ons</h3>
                <div className="flex flex-wrap gap-3">
                  {selectedItem.addOns.map((addOn) => {
                    const isSelected = customAddOns.has(addOn.id);
                    return (
                      <button
                        key={addOn.id}
                        onClick={() => {
                          setCustomAddOns((prev) => {
                            const next = new Set(prev);
                            if (next.has(addOn.id)) next.delete(addOn.id);
                            else next.add(addOn.id);
                            return next;
                          });
                        }}
                        className={`rounded-full px-5 py-3 text-base font-medium transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-neutral-950 shadow-lg shadow-amber-500/25'
                            : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                        }`}
                      >
                        {addOn.name} +{formatPrice(addOn.price)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <h3 className="mb-3 text-lg font-semibold text-neutral-300">Special Instructions</h3>
              <textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Any special requests..."
                rows={3}
                className="w-full rounded-2xl border border-neutral-700 bg-neutral-900 px-5 py-4 text-base text-white placeholder-neutral-500 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Add to Cart sticky button */}
          <div className="fixed inset-x-0 bottom-0 border-t border-neutral-800 bg-neutral-950/95 px-6 py-4 backdrop-blur-sm">
            <button
              onClick={handleAddToCart}
              className="w-full rounded-2xl bg-amber-500 py-5 text-xl font-bold text-neutral-950 transition hover:bg-amber-400 active:scale-[0.98]"
            >
              Add to Cart &mdash; {formatPrice(getCustomizeUnitPrice())}
            </button>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* STEP 4: CART */}
      {/* ----------------------------------------------------------------- */}
      {step === 'cart' && (
        <div
          className={`flex min-h-screen flex-col transition-all duration-300 ease-out ${transitionClass}`}
        >
          {/* Header */}
          <div className="flex items-center gap-4 border-b border-neutral-800 px-6 py-4">
            <button
              onClick={() => goTo('menu')}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-800 text-xl transition hover:bg-neutral-700"
              aria-label="Back"
            >
              ←
            </button>
            <h2 className="text-2xl font-bold">Your Cart</h2>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-64">
            {/* Cart items */}
            {cart.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
                <p className="text-xl">Your cart is empty</p>
                <button
                  onClick={() => goTo('menu')}
                  className="mt-4 text-amber-400 underline"
                >
                  Browse the menu
                </button>
              </div>
            ) : (
              <div className="divide-y divide-neutral-800">
                {cart.items.map((item) => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    onIncrement={() => cart.updateQuantity(item.id, item.quantity + 1)}
                    onDecrement={() => cart.updateQuantity(item.id, item.quantity - 1)}
                    onRemove={() => cart.removeItem(item.id)}
                  />
                ))}
              </div>
            )}

            {/* Customer name */}
            {cart.items.length > 0 && (
              <div className="mt-8">
                <label className="mb-2 block text-lg font-semibold text-neutral-300">
                  What&apos;s your name?
                </label>
                <input
                  type="text"
                  value={cart.customerName}
                  onChange={(e) => cart.setCustomerName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full rounded-2xl border border-neutral-700 bg-neutral-900 px-6 py-5 text-xl text-white placeholder-neutral-500 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            )}

            {/* Loyalty phone */}
            {cart.items.length > 0 && (
              <div className="mt-6">
                <label className="mb-2 block text-lg font-semibold text-neutral-300">
                  Enter phone for rewards
                </label>
                <input
                  type="tel"
                  value={loyaltyPhone}
                  onChange={(e) => {
                    setLoyaltyPhone(e.target.value);
                    lookupLoyalty(e.target.value);
                  }}
                  placeholder="(555) 123-4567"
                  className="w-full rounded-2xl border border-neutral-700 bg-neutral-900 px-6 py-5 text-xl text-white placeholder-neutral-500 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                {loyaltyMember && (
                  <div className="mt-3 flex items-center gap-3">
                    <span className="rounded-full bg-emerald-600/20 px-4 py-1.5 text-base font-semibold text-emerald-400">
                      {loyaltyMember.points} points
                    </span>
                    {loyaltyMember.name && (
                      <span className="text-base text-neutral-400">{loyaltyMember.name}</span>
                    )}
                    {loyaltyMember.canRedeem && (
                      <button
                        onClick={() => setRedeemPoints(!redeemPoints)}
                        className={`ml-auto rounded-2xl px-5 py-2.5 text-base font-semibold transition-all ${
                          redeemPoints
                            ? 'bg-emerald-500 text-neutral-950 shadow-lg shadow-emerald-500/25'
                            : 'bg-neutral-800 text-emerald-400 hover:bg-neutral-700'
                        }`}
                      >
                        Redeem {loyaltyMember.points} pts (${loyaltyMember.redeemValue.toFixed(2)} off)
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cart footer */}
          {cart.items.length > 0 && (
            <div className="fixed inset-x-0 bottom-0 space-y-4 border-t border-neutral-800 bg-neutral-950/95 px-6 py-5 backdrop-blur-sm">
              {/* Totals */}
              <div className="space-y-1 text-base">
                <div className="flex justify-between text-neutral-400">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Tax (8%)</span>
                  <span>{formatPrice(tax)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span className="text-amber-400">{formatPrice(total)}</span>
                </div>
              </div>

              {placeError && (
                <p className="text-center text-sm text-red-400">{placeError}</p>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => goTo('menu')}
                  className="rounded-2xl bg-neutral-800 py-4 text-lg font-semibold text-neutral-200 transition hover:bg-neutral-700 active:scale-[0.98]"
                >
                  Add More Items
                </button>
                <button
                  onClick={handlePlaceOrder}
                  disabled={placing}
                  className="rounded-2xl bg-amber-500 py-4 text-lg font-bold text-neutral-950 transition hover:bg-amber-400 active:scale-[0.98] disabled:opacity-50"
                >
                  {placing ? 'Placing...' : 'Place Order'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* STEP 5: CONFIRMATION */}
      {/* ----------------------------------------------------------------- */}
      {step === 'confirmation' && placedOrder && (
        <div
          className={`flex min-h-screen flex-col items-center justify-center px-6 text-center transition-all duration-300 ease-out ${transitionClass}`}
        >
          <div className="mb-6 text-6xl">✅</div>
          <h1 className="mb-2 text-5xl font-bold text-amber-400">
            Order #{placedOrder.displayNumber}
          </h1>
          <p className="mb-1 text-2xl text-neutral-200">
            Your order is being prepared!
          </p>
          {placedOrder.customerName && (
            <p className="mb-4 text-xl text-neutral-400">
              Thanks, {placedOrder.customerName}!
            </p>
          )}

          {/* Loyalty points earned */}
          {loyaltyPointsEarned && (
            <div className="mb-8 rounded-2xl bg-emerald-600/20 px-6 py-4">
              <p className="text-lg font-semibold text-emerald-400">
                You earned {loyaltyPointsEarned} points!
                {loyaltyNewBalance != null && (
                  <span className="ml-2 text-base text-emerald-300/80">
                    Balance: {loyaltyNewBalance} points
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Items summary */}
          <div className="mb-8 w-full max-w-md rounded-2xl bg-neutral-900 p-6">
            <ul className="space-y-2 text-left text-lg">
              {placedOrder.items.map((item, idx) => (
                <li key={idx} className="flex justify-between text-neutral-300">
                  <span>
                    {item.quantity > 1 && `${item.quantity}x `}
                    {item.menuItem.name}
                    {item.size && ` (${item.size.charAt(0)})`}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-neutral-800 pt-3 text-right text-xl font-bold text-amber-400">
              {formatPrice(placedOrder.total)}
            </div>
          </div>

          {/* Countdown */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative h-2 w-48 overflow-hidden rounded-full bg-neutral-800">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-1000 ease-linear"
                style={{ width: `${(countdown / 15) * 100}%` }}
              />
            </div>
            <p className="text-sm text-neutral-500">
              Returning to start in {countdown}s
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Cart Item Row
// ---------------------------------------------------------------------------

function CartItemRow({
  item,
  onIncrement,
  onDecrement,
  onRemove,
}: {
  item: InStoreCartItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}) {
  const details: string[] = [];
  if (item.size) {
    const sizeLabels: Record<string, string> = { SMALL: 'S', MEDIUM: 'M', LARGE: 'L' };
    details.push(sizeLabels[item.size] || item.size);
  }
  if (item.milkType && item.milkType !== 'NONE') {
    details.push(item.milkType.replace('TWO_PERCENT', '2%').replace('_', ' ').toLowerCase());
  }
  if (item.temperature) {
    details.push(item.temperature.toLowerCase());
  }
  if (item.addOns.length > 0) {
    details.push(item.addOns.map((a) => a.name).join(', '));
  }

  return (
    <div className="flex items-center gap-4 py-5">
      <div className="flex-1 min-w-0">
        <p className="text-lg font-semibold leading-tight">{item.menuItemName}</p>
        {details.length > 0 && (
          <p className="mt-0.5 truncate text-sm text-neutral-400">{details.join(' · ')}</p>
        )}
        {item.notes && (
          <p className="mt-0.5 truncate text-sm italic text-neutral-500">
            &quot;{item.notes}&quot;
          </p>
        )}
      </div>

      {/* Quantity controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onDecrement}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-800 text-lg font-bold transition hover:bg-neutral-700"
        >
          −
        </button>
        <span className="w-8 text-center text-lg font-semibold">{item.quantity}</span>
        <button
          onClick={onIncrement}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-800 text-lg font-bold transition hover:bg-neutral-700"
        >
          +
        </button>
      </div>

      {/* Price + remove */}
      <div className="flex flex-col items-end gap-1">
        <span className="text-lg font-bold text-amber-400">
          {formatPrice(item.unitPrice * item.quantity)}
        </span>
        <button
          onClick={onRemove}
          className="text-xs text-neutral-500 transition hover:text-red-400"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
