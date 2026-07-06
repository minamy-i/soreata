'use client';

import { useState } from 'react';

// アコーディオン（クリックで開閉する項目）の開閉状態を管理する共通フック
export function useAccordion() {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  function toggle(index: number) {
    setOpenItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function reset() {
    setOpenItems(new Set());
  }

  return { openItems, toggle, reset };
}
