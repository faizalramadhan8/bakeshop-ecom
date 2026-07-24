import { useEffect, useState, useCallback } from "react";
import { cartApi, type Cart } from "./api";

// Global cart state — modul level supaya semua component sync tanpa
// Context boilerplate. Simple pattern per skala Bu Santi.
let currentCart: Cart | null = null;
const listeners = new Set<(c: Cart | null) => void>();

function notify() {
  for (const l of listeners) l(currentCart);
}

export async function refreshCart(): Promise<Cart | null> {
  try {
    currentCart = await cartApi.get();
    notify();
    return currentCart;
  } catch {
    currentCart = null;
    notify();
    return null;
  }
}

export async function addToCart(productId: string, quantity: number): Promise<Cart> {
  currentCart = await cartApi.add(productId, quantity);
  notify();
  return currentCart;
}

export async function updateCartItem(itemId: string, quantity: number): Promise<Cart> {
  currentCart = await cartApi.update(itemId, quantity);
  notify();
  return currentCart;
}

export async function removeCartItem(itemId: string): Promise<Cart> {
  currentCart = await cartApi.remove(itemId);
  notify();
  return currentCart;
}

// Hook untuk component subscribe ke cart state.
export function useCart(): { cart: Cart | null; refresh: () => Promise<Cart | null> } {
  const [cart, setCart] = useState<Cart | null>(currentCart);
  useEffect(() => {
    listeners.add(setCart);
    if (currentCart === null) {
      refreshCart();
    }
    return () => {
      listeners.delete(setCart);
    };
  }, []);
  const refresh = useCallback(() => refreshCart(), []);
  return { cart, refresh };
}
