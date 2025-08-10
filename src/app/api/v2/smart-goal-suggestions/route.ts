import { NextRequest, NextResponse } from 'next/server';

type Voice = 'professional' | 'friendly' | 'casual' | 'authoritative' | 'creative';

export interface SmartGoalSuggestion {
  headline: string;
  subcopy?: string;
  offer?: string;
  cta?: string;
  urgency?: string;
  category: 'high_impact' | 'promotion' | 'speed' | 'guarantee' | 'awareness' | 'bundle' | 'trust';
  rationale?: string;
}

function sanitizeString(input: unknown): string | undefined {
  return typeof input === 'string' && input.trim() ? input.trim() : undefined;
}

function coerceArray(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map(String).filter(Boolean);
  }
  return [];
}

async function callOpenAI(payload: {
  industry: string;
  businessTypes: string[];
  brandVoice?: Voice;
  businessDescription?: string;
  targetArea?: string;
}): Promise<SmartGoalSuggestion[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const system = `You are a direct mail marketing strategist. Create concise, postcard-ready campaign goal suggestions.
Return ONLY valid JSON with this exact shape: {"suggestions": Array<{
  "headline": string,
  "subcopy"?: string,
  "offer"?: string,
  "cta"?: string,
  "urgency"?: string,
  "category": "high_impact" | "promotion" | "speed" | "guarantee" | "awareness" | "bundle" | "trust",
  "rationale"?: string
}>}
Rules:
- Use the provided context (industry, business types, description, area, voice) to make ideas specific but not templated to a single niche.
- Mix 8–10 ideas across categories: promos, guarantees, speed/availability, differentiation, bundles, awareness.
- Use concrete numbers/timeframes when appropriate (e.g., "within 2 hours", "save 15%", "3 runs/week"), but avoid false claims.
- Keep copy punchy (headlines ~6–10 words, subcopy one sentence). No placeholders like [Business Name] or [service].`;

  const user = {
    industry: payload.industry,
    businessTypes: payload.businessTypes,
    brandVoice: payload.brandVoice,
    businessDescription: payload.businessDescription,
    targetArea: payload.targetArea
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify(user) }
      ]
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OpenAI error: ${res.status} - ${errorText}`);
  }

  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content || '';

  // Attempt to parse JSON directly, fallback to extracting the JSON array
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Try to extract the first JSON object
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start >= 0 && end > start) {
      parsed = JSON.parse(content.slice(start, end + 1));
    } else {
      throw new Error('Failed to parse OpenAI response');
    }
  }

  const suggestionsArray = ((): SmartGoalSuggestion[] => {
    if (parsed && typeof parsed === 'object' && 'suggestions' in parsed) {
      const val = (parsed as { suggestions?: unknown }).suggestions;
      if (Array.isArray(val)) {
        return val as SmartGoalSuggestion[];
      }
    }
    return [];
  })();

  // Basic validation and trimming
  const cleaned = suggestionsArray
    .map((s) => ({
      headline: sanitizeString(s.headline) || '',
      subcopy: sanitizeString(s.subcopy),
      offer: sanitizeString(s.offer),
      cta: sanitizeString(s.cta),
      urgency: sanitizeString(s.urgency),
      category: (s.category as SmartGoalSuggestion['category']) || 'awareness',
      rationale: sanitizeString(s.rationale)
    }))
    .filter(s => s.headline);

  return cleaned.slice(0, 10);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const industry = sanitizeString(body.industry);
    if (!industry) {
      return NextResponse.json({ error: 'Industry is required' }, { status: 400 });
    }

    const businessTypes = coerceArray(body.businessTypes);
    const brandVoice = sanitizeString(body.brandVoice) as Voice | undefined;
    const businessDescription = sanitizeString(body.businessDescription);
    const targetArea = sanitizeString(body.targetArea);

    const suggestions = await callOpenAI({
      industry,
      businessTypes,
      brandVoice,
      businessDescription,
      targetArea
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('smart-goal-suggestions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


