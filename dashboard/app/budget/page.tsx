'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { strings } from '@/lib/strings';
import { days } from '@/lib/itinerary';
import { useMotionEnabled } from '@/lib/useMotionEnabled';
import { cn } from '@/lib/utils';
import type { Expense } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import StatCard from '@/components/StatCard';
import Reveal from '@/components/ui/Reveal';
import StaggerList from '@/components/ui/StaggerList';
import Card, { CARD_SURFACE } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import AccordionSection from '@/components/ui/AccordionSection';
import AnimatedNumber from '@/components/ui/AnimatedNumber';

type Category = Expense['category'];
type Currency = Expense['currency'];
type ConvCurrency = 'CZK' | 'EUR' | 'ILS';

const CATEGORIES: { key: Category; label: string; emoji: string }[] = [
  { key: 'fuel', label: strings.budget.fuel, emoji: '⛽' },
  { key: 'camping', label: strings.budget.camping, emoji: '⛺' },
  { key: 'food', label: strings.budget.food, emoji: '🍕' },
  { key: 'supplies', label: strings.budget.supplies, emoji: '🛒' },
  { key: 'activity', label: strings.budget.activity, emoji: '🎯' },
  { key: 'other', label: strings.budget.other, emoji: '📦' },
];

const CATEGORY_LABELS: Record<Category, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.label])
) as Record<Category, string>;

const FALLBACK_CZK_PER_EUR = 25;
const FALLBACK_ILS_PER_EUR = 3.9;

interface Rates {
  czkPerEur: number;
  ilsPerEur: number;
}

function convert(amount: number, from: ConvCurrency, to: ConvCurrency, rates: Rates): number {
  if (from === to) return amount;
  const toEur: Record<ConvCurrency, number> = { EUR: 1, CZK: 1 / rates.czkPerEur, ILS: 1 / rates.ilsPerEur };
  const fromEur: Record<ConvCurrency, number> = { EUR: 1, CZK: rates.czkPerEur, ILS: rates.ilsPerEur };
  return amount * toEur[from] * fromEur[to];
}

export default function BudgetPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    currency: 'CZK' as Currency,
    category: 'food' as Category,
    note: '',
    day: days[0],
  });
  const [rates, setRates] = useState<Rates>({ czkPerEur: FALLBACK_CZK_PER_EUR, ilsPerEur: FALLBACK_ILS_PER_EUR });
  const [ratesLive, setRatesLive] = useState(false);

  // Converter state
  const [convAmount, setConvAmount] = useState('100');
  const [convFrom, setConvFrom] = useState<ConvCurrency>('CZK');
  const [convTo, setConvTo] = useState<ConvCurrency>('EUR');

  const motionEnabled = useMotionEnabled();

  useEffect(() => {
    loadExpenses();
    fetchRates();
  }, []);

  async function fetchRates() {
    try {
      const res = await fetch('https://api.frankfurter.app/latest?from=EUR&to=CZK,ILS');
      if (!res.ok) return;
      const data = await res.json();
      if (data?.rates?.CZK && data?.rates?.ILS) {
        setRates({ czkPerEur: data.rates.CZK, ilsPerEur: data.rates.ILS });
        setRatesLive(true);
      }
    } catch {
      // keep fallback rates
    }
  }

  async function loadExpenses() {
    const { data } = await supabase.from('expenses').select('*').order('timestamp', { ascending: false });
    if (data) setExpenses(data as Expense[]);
  }

  async function addExpense() {
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) return;
    const { data } = await supabase
      .from('expenses')
      .insert({
        amount,
        currency: form.currency,
        category: form.category,
        note: form.note,
        day: form.day,
        timestamp: Date.now(),
      })
      .select()
      .single();
    if (data) {
      setExpenses([data as Expense, ...expenses]);
      setForm({ amount: '', currency: 'CZK', category: 'food', note: '', day: days[0] });
      setShowForm(false);
    }
  }

  async function deleteExpense(id: string) {
    await supabase.from('expenses').delete().eq('id', id);
    setExpenses(expenses.filter((e) => e.id !== id));
  }

  const totalCZK = expenses.filter((e) => e.currency === 'CZK').reduce((s, e) => s + e.amount, 0);
  const totalEUR = expenses.filter((e) => e.currency === 'EUR').reduce((s, e) => s + e.amount, 0);

  const czkRate = rates.czkPerEur;

  const categoryTotals = CATEGORIES.map((cat) => {
    const czk = expenses.filter((e) => e.category === cat.key && e.currency === 'CZK').reduce((s, e) => s + e.amount, 0);
    const eur = expenses.filter((e) => e.category === cat.key && e.currency === 'EUR').reduce((s, e) => s + e.amount, 0);
    return { ...cat, czk, eur, total: czk + eur * czkRate };
  });

  const grandTotalCZK = totalCZK + totalEUR * czkRate;
  const grandTotalILS = grandTotalCZK / czkRate * rates.ilsPerEur;

  // Converter computed value
  const convNum = parseFloat(convAmount) || 0;
  const convResult = convert(convNum, convFrom, convTo, rates);
  const convRateDisplay = convNum > 0 ? (convResult / convNum).toFixed(4) : '—';

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <PageHeader
          title={strings.budget.title}
          action={
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? strings.today.cancel : strings.budget.addExpense}
            </Button>
          }
        />
      </div>

      {/* Add Form */}
      {showForm && (
        <Reveal duration={250} className={cn(CARD_SURFACE, 'p-6 mb-6')}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{strings.budget.amount}</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">מטבע</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value as Currency })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="CZK">CZK</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">קטגוריה</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{strings.budget.day}</label>
              <select
                value={form.day}
                onChange={(e) => setForm({ ...form, day: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                {days.map((d) => (
                  <option key={d} value={d}>
                    {strings.budget.day} {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{strings.budget.note}</label>
              <input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="..."
              />
            </div>
          </div>
          <Button onClick={addExpense} className="mt-4 px-6">
            {strings.budget.addExpense}
          </Button>
        </Reveal>
      )}

      {/* Summary Cards */}
      <StaggerList className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label={`${strings.budget.total} (CZK)`} value={totalCZK} suffix="Kč" />
        <StatCard label={`${strings.budget.total} (EUR)`} value={totalEUR} prefix="€" />
        <StatCard label={`${strings.budget.total} (≈CZK)`} value={Math.round(grandTotalCZK)} suffix="Kč" emphasis />
        <StatCard label={`${strings.budget.total} (≈ILS)`} value={Math.round(grandTotalILS)} prefix="₪" emphasis />
      </StaggerList>

      {/* Currency Converter */}
      <AccordionSection
        className="mb-6"
        title={`💱 ${strings.budget.converter}`}
        meta={
          ratesLive ? (
            <span className="flex items-center gap-1 text-xs font-medium text-green-600">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              {strings.budget.liveRate}
            </span>
          ) : (
            <span className="text-xs font-medium text-gray-400">{strings.budget.rateUnavailable}</span>
          )
        }
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs font-semibold text-gray-500 mb-1">{strings.budget.amount}</label>
            <input
              type="number"
              value={convAmount}
              onChange={(e) => setConvAmount(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="100"
            />
          </div>
          <div className="min-w-[80px]">
            <label className="block text-xs font-semibold text-gray-500 mb-1">{strings.budget.from}</label>
            <select
              value={convFrom}
              onChange={(e) => setConvFrom(e.target.value as ConvCurrency)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="CZK">CZK</option>
              <option value="EUR">EUR</option>
              <option value="ILS">ILS</option>
            </select>
          </div>
          <Button
            variant="secondary"
            onClick={() => { setConvFrom(convTo); setConvTo(convFrom); }}
            className="font-bold"
            title="Swap"
          >
            ⇄
          </Button>
          <div className="min-w-[80px]">
            <label className="block text-xs font-semibold text-gray-500 mb-1">{strings.budget.to}</label>
            <select
              value={convTo}
              onChange={(e) => setConvTo(e.target.value as ConvCurrency)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="CZK">CZK</option>
              <option value="EUR">EUR</option>
              <option value="ILS">ILS</option>
            </select>
          </div>
          <div className="flex-1 min-w-[140px] text-left">
            <div className="text-xs text-gray-400 mb-1">=</div>
            <div className="text-2xl font-bold text-primary">
              {convTo === 'CZK' && `${convResult.toFixed(2)} Kč`}
              {convTo === 'EUR' && `€${convResult.toFixed(2)}`}
              {convTo === 'ILS' && `₪${convResult.toFixed(2)}`}
            </div>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-400">
          1 {convFrom} = {convRateDisplay} {convTo}
          {ratesLive && <span className="mr-2"> · {strings.budget.liveRate} (Frankfurter API)</span>}
        </div>
      </AccordionSection>

      {/* Category Breakdown */}
      <Card className="p-6 mb-6">
        <h2 className="font-bold text-primary mb-4">פירוט לפי קטגוריה</h2>
        <div className="space-y-3">
          {categoryTotals.map((cat) => {
            const pct = grandTotalCZK > 0 ? (cat.total / grandTotalCZK) * 100 : 0;
            return (
              <div key={cat.key}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">
                    {cat.emoji} {cat.label}
                  </span>
                  <span className="flex items-baseline gap-2 text-gray-500">
                    <span>
                      {cat.czk > 0 && `${cat.czk} Kč`}
                      {cat.czk > 0 && cat.eur > 0 && ' + '}
                      {cat.eur > 0 && `€${cat.eur}`}
                    </span>
                    <span className="text-xs font-semibold text-gray-400">
                      <AnimatedNumber value={pct} />%
                    </span>
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  {motionEnabled ? (
                    <motion.div
                      data-motion=""
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  ) : (
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Expense List */}
      <Card>
        {expenses.length === 0 ? (
          <EmptyState
            emoji="🧾"
            title={strings.budget.noExpenses}
            description={strings.budget.emptyHint}
            action={<Button onClick={() => setShowForm(true)}>{strings.budget.addExpense}</Button>}
          />
        ) : (
          <>
          {/* Mobile: card rows */}
          <StaggerList className="divide-y divide-gray-50 md:hidden">
            {expenses.map((e) => (
              <div key={e.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-primary">
                      {CATEGORIES.find((c) => c.key === e.category)?.emoji}{' '}
                      {CATEGORY_LABELS[e.category]}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {strings.budget.day} {e.day}
                    </p>
                    {e.note && <p className="mt-1 text-sm text-gray-500">{e.note}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-base font-extrabold text-primary">
                      {e.currency === 'CZK' ? `${e.amount} Kč` : `€${e.amount}`}
                    </span>
                    <button
                      onClick={() => deleteExpense(e.id)}
                      className="text-xs font-medium text-red-400 hover:text-red-600"
                    >
                      {strings.budget.delete}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </StaggerList>

          {/* Desktop: table */}
          <table className="hidden w-full text-sm md:table">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 text-xs">
                <th className="py-3 px-4 text-right font-medium">{strings.budget.day}</th>
                <th className="py-3 px-4 text-right font-medium">קטגוריה</th>
                <th className="py-3 px-4 text-right font-medium">{strings.budget.amount}</th>
                <th className="py-3 px-4 text-right font-medium">{strings.budget.note}</th>
                <th className="py-3 px-4 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{strings.budget.day} {e.day}</td>
                  <td className="py-3 px-4">
                    {CATEGORIES.find((c) => c.key === e.category)?.emoji}{' '}
                    {CATEGORY_LABELS[e.category]}
                  </td>
                  <td className="py-3 px-4 font-semibold">
                    {e.currency === 'CZK' ? `${e.amount} Kč` : `€${e.amount}`}
                  </td>
                  <td className="py-3 px-4 text-gray-500">{e.note}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => deleteExpense(e.id)}
                      className="text-red-400 hover:text-red-600 text-xs"
                    >
                      {strings.budget.delete}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </>
        )}
      </Card>
    </div>
  );
}
