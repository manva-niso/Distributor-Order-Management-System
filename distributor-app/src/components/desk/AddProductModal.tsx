"use client";

import React, { useState } from "react";
import { Plus, X, Package, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { SeedSku } from "@/db/seed-data";
import { transliterateToHindi } from "@/lib/i18n/transliterate";

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdded: (newSku: SeedSku) => void;
}

const CATEGORIES = [
  "Biscuits & Confectionery",
  "Tea, Coffee & Beverages",
  "Edible Oils & Ghee",
  "Laundry & Detergents",
  "Personal Care & Toilet Soaps",
  "Packaged Foods & Noodles",
  "Home Care & Cleaning",
  "General Grocery",
];

export default function AddProductModal({
  isOpen,
  onClose,
  onProductAdded,
}: AddProductModalProps) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [packSize, setPackSize] = useState("100g");
  const [unitsPerCase, setUnitsPerCase] = useState("48");
  const [dealerPrice, setDealerPrice] = useState("1200");
  const [stockCases, setStockCases] = useState("50");
  const [gstRate, setGstRate] = useState("18");
  const [schemeType, setSchemeType] = useState<"NONE" | "FREE_GOODS" | "FLAT_REBATE" | "SLAB_DISCOUNT">("NONE");

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Please enter product name");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const payload = {
        action: "add_sku",
        sku: {
          name: name.trim(),
          nameHi: transliterateToHindi(name.trim()),
          brand: brand.trim() || "Brand",
          brandHi: transliterateToHindi(brand.trim() || "Brand"),
          category,
          categoryHi: transliterateToHindi(category),
          packSize: packSize.trim() || "Standard",
          packSizeHi: transliterateToHindi(packSize.trim() || "Standard"),
          unitsPerCase: Number(unitsPerCase) || 24,
          dealerPrice: Number(dealerPrice) || 100,
          stockCases: Number(stockCases) || 10,
          gstRate: Number(gstRate) || 18,
          schemeType,
        },
      };

      const res = await fetch("/api/catalogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to add product");
        return;
      }

      onProductAdded(data.sku);
      onClose();
    } catch {
      setErrorMsg("Network error adding product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-slate-900">
        <div className="p-4 sm:px-6 sm:py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center shadow-xs">
              <Package className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 leading-tight">
                Add Wholesale Product to Catalog
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Order Desk: Fill your distributor catalog & stock
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5">
          {errorMsg && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-900 rounded-lg text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Product Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Parle Hide & Seek Chocolate Cookies 120g"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-emerald-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Brand
              </label>
              <input
                type="text"
                placeholder="e.g. Parle / Britannia / Tata"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-emerald-600"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-emerald-600"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Pack Size
              </label>
              <input
                type="text"
                placeholder="e.g. 100g, 1L"
                value={packSize}
                onChange={(e) => setPackSize(e.target.value)}
                className="w-full text-xs font-semibold px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-emerald-600"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Units / Case
              </label>
              <input
                type="number"
                min="1"
                placeholder="48"
                value={unitsPerCase}
                onChange={(e) => setUnitsPerCase(e.target.value)}
                className="w-full text-xs font-semibold px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-emerald-600"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Wholesale ₹ / Case
              </label>
              <input
                type="number"
                min="1"
                placeholder="1200"
                value={dealerPrice}
                onChange={(e) => setDealerPrice(e.target.value)}
                className="w-full text-xs font-semibold px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Initial Stock (Cases)
              </label>
              <input
                type="number"
                min="0"
                placeholder="50"
                value={stockCases}
                onChange={(e) => setStockCases(e.target.value)}
                className="w-full text-xs font-semibold px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-emerald-600"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                GST Rate
              </label>
              <select
                value={gstRate}
                onChange={(e) => setGstRate(e.target.value)}
                className="w-full text-xs font-semibold px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-emerald-600"
              >
                <option value="5">5% (Staples / Tea)</option>
                <option value="12">12% (Noodles / Foods)</option>
                <option value="18">18% (Biscuits / Soaps)</option>
                <option value="28">28% (Luxury / Aerated)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Trade Scheme
              </label>
              <select
                value={schemeType}
                onChange={(e) => setSchemeType(e.target.value as any)}
                className="w-full text-xs font-semibold px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-emerald-600"
              >
                <option value="NONE">None (Regular)</option>
                <option value="FREE_GOODS">Buy 10 Get 1 Free</option>
                <option value="FLAT_REBATE">Flat Rebate (₹25/case)</option>
                <option value="SLAB_DISCOUNT">Slab Discount (3%-6%)</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-bold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-800 text-white hover:bg-emerald-900 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Adding to Catalog...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save Product</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
