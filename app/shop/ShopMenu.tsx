'use client'

import { useMemo, useState } from 'react'
import { useCart } from '@/lib/shop/cart-context'
import { shopTheme } from '@/lib/shop/theme'
import { CartAddon, ShopAddon, ShopCategory, ShopProduct, SWEETNESS_LEVELS, cartItemKey } from '@/lib/shop/types'

export default function ShopMenu({
  categories,
  products,
  addons,
}: {
  categories: ShopCategory[]
  products: ShopProduct[]
  addons: ShopAddon[]
}) {
  const [activeProduct, setActiveProduct] = useState<ShopProduct | null>(null)

  const grouped = useMemo(() => {
    return categories.map((c) => ({
      category: c,
      items: products.filter((p) => p.category_id === c.id),
    }))
  }, [categories, products])

  return (
    <div>
      <h1 style={{ color: shopTheme.maroon, fontSize: 22, marginBottom: 4 }}>เมนูเครื่องดื่ม</h1>
      <p style={{ color: shopTheme.muted, marginBottom: 28, fontSize: 14 }}>เลือกเครื่องดื่มที่ชอบ ปรับขนาด ความเย็น และความหวานได้ตามใจ</p>

      {grouped.map(({ category, items }) =>
        items.length === 0 ? null : (
          <section key={category.id} style={{ marginBottom: 32 }}>
            <h2 style={{ color: shopTheme.maroonDark, fontSize: 16, marginBottom: 12, borderBottom: `2px solid ${shopTheme.border}`, paddingBottom: 8 }}>
              {category.name}
            </h2>
            <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {items.map((product) => (
                <ProductCard key={product.id} product={product} onCustomize={() => setActiveProduct(product)} />
              ))}
            </div>
          </section>
        )
      )}

      {activeProduct && <CustomizeModal product={activeProduct} addons={addons} onClose={() => setActiveProduct(null)} />}
    </div>
  )
}

function ProductCard({ product, onCustomize }: { product: ShopProduct; onCustomize: () => void }) {
  const { addItem } = useCart()
  const [justAdded, setJustAdded] = useState(false)

  function quickAdd(e: React.MouseEvent) {
    e.stopPropagation()
    const temperature = product.hot_available ? 'hot' : 'iced'
    const sweetness = SWEETNESS_LEVELS[0]
    addItem({
      key: cartItemKey(product.id, 'normal', temperature, sweetness, []),
      productId: product.id,
      name: product.name,
      emoji: product.image_emoji,
      unitPrice: product.base_price,
      size: 'normal',
      temperature,
      sweetness,
      addons: [],
      quantity: 1,
    })
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 900)
  }

  return (
    <div
      style={{
        textAlign: 'left',
        background: shopTheme.card,
        border: `1px solid ${shopTheme.border}`,
        borderRadius: 14,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        position: 'relative',
      }}
    >
      <button onClick={onCustomize} style={{ all: 'unset', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 32 }}>{product.image_emoji}</div>
        <div style={{ fontWeight: 700, color: shopTheme.text, fontSize: 15 }}>{product.name}</div>
        {product.description && <div style={{ fontSize: 12, color: shopTheme.muted }}>{product.description}</div>}
      </button>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontWeight: 700, color: shopTheme.maroon }}>{product.base_price} บาท</span>
        <button
          onClick={quickAdd}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: 'none',
            background: justAdded ? '#3a8f4a' : shopTheme.maroon,
            color: '#fff',
            fontSize: 18,
            lineHeight: 1,
            cursor: 'pointer',
          }}
          aria-label={`เพิ่ม ${product.name} ลงตะกร้า (ค่าเริ่มต้น)`}
          title="เพิ่มลงตะกร้าแบบปกติ"
        >
          {justAdded ? '✓' : '+'}
        </button>
      </div>
      <button onClick={onCustomize} style={{ all: 'unset', cursor: 'pointer', fontSize: 11, color: shopTheme.muted, textDecoration: 'underline' }}>
        ปรับแต่ง (ขนาด/ความหวาน/เพิ่มเติม)
      </button>
    </div>
  )
}

function CustomizeModal({ product, addons, onClose }: { product: ShopProduct; addons: ShopAddon[]; onClose: () => void }) {
  const { addItem } = useCart()
  const [size, setSize] = useState<'normal' | 'large'>('normal')
  const [temperature, setTemperature] = useState<'hot' | 'iced'>(product.hot_available ? 'hot' : 'iced')
  const [sweetness, setSweetness] = useState<string>(SWEETNESS_LEVELS[0])
  const [selectedAddons, setSelectedAddons] = useState<CartAddon[]>([])
  const [quantity, setQuantity] = useState(1)

  const unitPrice = product.base_price + (size === 'large' ? product.large_upcharge : 0)
  const addonsTotal = selectedAddons.reduce((s, a) => s + a.price, 0)
  const lineTotal = (unitPrice + addonsTotal) * quantity

  function toggleAddon(addon: ShopAddon) {
    setSelectedAddons((prev) =>
      prev.some((a) => a.name === addon.name) ? prev.filter((a) => a.name !== addon.name) : [...prev, { name: addon.name, price: addon.price }]
    )
  }

  function handleAdd() {
    addItem({
      key: cartItemKey(product.id, size, temperature, sweetness, selectedAddons),
      productId: product.id,
      name: product.name,
      emoji: product.image_emoji,
      unitPrice,
      size,
      temperature,
      sweetness,
      addons: selectedAddons,
      quantity,
    })
    onClose()
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 36 }}>{product.image_emoji}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{product.name}</div>
            {product.description && <div style={{ fontSize: 12, color: shopTheme.muted }}>{product.description}</div>}
          </div>
        </div>

        <Field label="ขนาด">
          <OptionRow
            options={[
              { value: 'normal', label: `ปกติ (+0)` },
              { value: 'large', label: `ใหญ่ (+${product.large_upcharge})` },
            ]}
            value={size}
            onChange={(v) => setSize(v as 'normal' | 'large')}
          />
        </Field>

        <Field label="ความเย็น">
          <OptionRow
            options={[
              ...(product.hot_available ? [{ value: 'hot', label: 'ร้อน' }] : []),
              ...(product.iced_available ? [{ value: 'iced', label: 'เย็น' }] : []),
            ]}
            value={temperature}
            onChange={(v) => setTemperature(v as 'hot' | 'iced')}
          />
        </Field>

        <Field label="ความหวาน">
          <OptionRow options={SWEETNESS_LEVELS.map((s) => ({ value: s, label: s }))} value={sweetness} onChange={setSweetness} />
        </Field>

        {addons.length > 0 && (
          <Field label="เพิ่มเติม">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {addons.map((addon) => {
                const checked = selectedAddons.some((a) => a.name === addon.name)
                return (
                  <button
                    key={addon.id}
                    onClick={() => toggleAddon(addon)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 999,
                      border: `1px solid ${checked ? shopTheme.maroon : shopTheme.border}`,
                      background: checked ? shopTheme.maroon : '#fff',
                      color: checked ? '#fff' : shopTheme.text,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    {addon.name} (+{addon.price})
                  </button>
                )
              })}
            </div>
          </Field>
        )}

        <Field label="จำนวน">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <QtyButton onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</QtyButton>
            <span style={{ fontWeight: 700, fontSize: 16, minWidth: 20, textAlign: 'center' }}>{quantity}</span>
            <QtyButton onClick={() => setQuantity((q) => q + 1)}>+</QtyButton>
          </div>
        </Field>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${shopTheme.border}`, background: '#fff', cursor: 'pointer' }}
          >
            ยกเลิก
          </button>
          <button
            onClick={handleAdd}
            style={{
              flex: 2,
              padding: '12px',
              borderRadius: 10,
              border: 'none',
              background: shopTheme.maroon,
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            เพิ่มลงตะกร้า · {lineTotal} บาท
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 13, color: shopTheme.muted, marginBottom: 8, fontWeight: 600 }}>{label}</div>
      {children}
    </div>
  )
}

function OptionRow({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: '8px 14px',
            borderRadius: 999,
            border: `1px solid ${value === opt.value ? shopTheme.maroon : shopTheme.border}`,
            background: value === opt.value ? shopTheme.maroon : '#fff',
            color: value === opt.value ? '#fff' : shopTheme.text,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function QtyButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        border: `1px solid ${shopTheme.border}`,
        background: '#fff',
        fontSize: 16,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}
