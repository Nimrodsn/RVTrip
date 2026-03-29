'use client';

import { useState } from 'react';
import { itinerary } from '@/lib/itinerary';
import { strings } from '@/lib/strings';

const TIPS = [
  'בדקו לחץ צמיגים כל בוקר לפני נסיעה.',
  'מלאו מיכל מים בכל קמפינג - לא תמיד יהיה זמין.',
  'השאירו 30% מתקציב הדלק כרזרבה.',
  'צלמו את מד הקילומטרים בהשכרה ובהחזרה.',
  'שמרו קבלות דלק - חלק מהחברות מחזירות מע"מ.',
  'בסלובקיה חובה כיסוי ראש במערות.',
  'בדקו שעות פתיחה של אטרקציות מראש - חלקן סוגרות מוקדם.',
];

const currencyAlertStop = itinerary.locations.find((l) => l.currencyAlert);

export default function CommanderPage() {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'bot'; text: string }>>([]);
  const [input, setInput] = useState('');

  const [sosLoading, setSosLoading] = useState(false);
  const [sosResult, setSosResult] = useState<string | null>(null);
  const [sosError, setSosError] = useState<string | null>(null);

  function sendMessage() {
    if (!input.trim()) return;
    const userMsg = { role: 'user' as const, text: input };
    const botMsg = {
      role: 'bot' as const,
      text: 'המפקד עדיין בפיתוח... בקרוב אוכל לעזור! 🤖',
    };
    setMessages([...messages, userMsg, botMsg]);
    setInput('');
  }

  async function handleSOS() {
    setSosLoading(true);
    setSosResult(null);
    setSosError(null);

    let lat: number;
    let lng: number;

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10_000,
        });
      });
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch {
      setSosLoading(false);
      setSosError(strings.commander.sosNoGps);
      return;
    }

    try {
      const res = await fetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat,
          lng,
          rvHeight: itinerary.rv_specs.height,
          rvWeight: itinerary.rv_specs.weight,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSosError(data.error || strings.commander.sosError);
      } else {
        setSosResult(data.result);
      }
    } catch {
      setSosError(strings.commander.sosError);
    }

    setSosLoading(false);
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-extrabold text-primary mb-6">{strings.commander.title}</h1>

      {/* SOS Button */}
      <button
        onClick={handleSOS}
        disabled={sosLoading}
        className="w-full mb-6 py-4 rounded-xl font-extrabold text-lg text-white bg-red-600 hover:bg-red-700 active:bg-red-800 transition-colors disabled:opacity-70 shadow-lg"
      >
        🚨 {strings.commander.sosButton}
      </button>

      {/* SOS Loading */}
      {sosLoading && (
        <div className="mb-6 rounded-xl border-2 border-red-300 bg-red-50 p-6 flex items-center justify-center gap-3">
          <span className="relative flex h-5 w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-5 w-5 bg-red-600" />
          </span>
          <span className="text-red-700 font-bold text-sm">{strings.commander.sosSearching}</span>
        </div>
      )}

      {/* SOS Error */}
      {sosError && !sosLoading && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-red-700 font-semibold text-sm">⚠️ {sosError}</p>
        </div>
      )}

      {/* SOS Result */}
      {sosResult && !sosLoading && (
        <div className="mb-6 rounded-xl border-2 border-red-200 bg-white shadow-md overflow-hidden">
          <div className="bg-red-600 px-5 py-3 flex items-center gap-2">
            <span className="text-white text-lg">🏥</span>
            <h3 className="font-bold text-white text-sm">{strings.commander.sosTitle}</h3>
          </div>
          <div className="p-5 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
            {sosResult}
          </div>
        </div>
      )}

      {/* Currency Alert */}
      {currencyAlertStop && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 mb-6">
          <h3 className="font-bold text-orange-800 mb-1">
            ⚠️ {strings.commander.currencyAlertTitle}
          </h3>
          <p className="text-sm text-orange-700">{strings.commander.currencyAlertText}</p>
          <p className="text-xs text-orange-500 mt-2">
            📍 {currencyAlertStop.name} ({strings.budget.day} {currencyAlertStop.day})
          </p>
        </div>
      )}

      {/* Trip Tips */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="font-bold text-primary mb-4">💡 {strings.commander.tripTips}</h2>
        <ul className="space-y-2">
          {TIPS.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
              <span className="text-primary font-bold shrink-0">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Chat Interface (placeholder) */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold text-primary text-sm">💬 שאל את המפקד</h3>
        </div>

        <div className="h-64 overflow-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-center text-gray-300 mt-16 text-sm">{strings.commander.placeholder}</p>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-100 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={strings.commander.placeholder}
            className="flex-1 px-4 py-2 border rounded-lg text-sm"
          />
          <button
            onClick={sendMessage}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            {strings.commander.send}
          </button>
        </div>
      </div>
    </div>
  );
}
