import { NextRequest, NextResponse } from 'next/server';
import { itinerary, getCurrentTripDay, getDateForDay } from '@/lib/itinerary';

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/** Where the convoy is supposed to be today, so answers can favour services along the route. */
function buildItineraryContext(day: number | null): string {
  if (day === null) return '';

  const stops = itinerary.locations.filter((l) => l.day === day);
  if (stops.length === 0) return '';

  const campsite = stops.find((l) => l.type === 'campsite');
  // The note carries what the stop actually involves, such as a cave tour or a mountain road.
  const stopLines = stops
    .map((l) => `- ${l.name} (${l.type}) at ${l.coords.lat}, ${l.coords.lng}${l.note ? ` - ${l.note}` : ''}`)
    .join('\n');

  return `
Trip context: today is day ${day} of ${itinerary.trip_name} (${getDateForDay(day)}).
Planned stops for today:
${stopLines}
${campsite ? `Tonight's campsite: ${campsite.name} at ${campsite.coords.lat}, ${campsite.coords.lng}.` : "No campsite is booked for tonight."}

Use this to prefer services near today's route and tonight's campsite, and say so if the SOS
coordinates are far from the planned stops, since that may mean the convoy is off route.
`;
}

function buildPrompt(
  lat: number,
  lng: number,
  rvHeight: number,
  rvWeight: number,
  day: number | null
): string {
  return `You are an emergency assistant for an RV convoy traveling through Czechia and Slovakia.
The convoy consists of two motorhomes (height: ${rvHeight}m, weight: ${rvWeight}t).
A user has pressed the SOS button from coordinates (${lat}, ${lng}).
${buildItineraryContext(day)}
Provide the following information:
1) The nearest hospital with address and phone number.
2) The nearest auto mechanic or RV service center.
3) Local police station and emergency number.
4) Towing service that can handle a ${rvWeight}t motorhome.
5) The country's general emergency number (112 for EU).
6) Any relevant local emergency info for the area.

Respond in Hebrew. Be concise and actionable. Format with clear numbered sections.`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured' },
      { status: 500 }
    );
  }

  let body: { lat: number; lng: number; rvHeight: number; rvWeight: number; day?: number | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { lat, lng, rvHeight, rvWeight } = body;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return NextResponse.json({ error: 'lat and lng are required numbers' }, { status: 400 });
  }

  // The traveller's device is the reliable clock here; the server may sit in another timezone.
  const day = typeof body.day === 'number' ? body.day : getCurrentTripDay();

  const prompt = buildPrompt(lat, lng, rvHeight ?? 3.2, rvWeight ?? 3.5, day);

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Gemini API error: ${res.status}`, details: errText },
        { status: 502 }
      );
    }

    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response from Gemini';

    return NextResponse.json({ result: text });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to reach Gemini API', details: String(err) },
      { status: 502 }
    );
  }
}
