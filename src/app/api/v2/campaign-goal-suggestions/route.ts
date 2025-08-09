import { NextRequest, NextResponse } from 'next/server';

const goalSuggestionsByCategory = {
  'drive_traffic': [
    'Visit our new location',
    'Book a consultation',
    'Schedule an appointment',
    'Come in for a tour',
    'Stop by this week'
  ],
  'promote_offers': [
    '20% off first visit',
    'Free consultation this month',
    'Buy one, get one 50% off',
    'New customer special',
    'Limited time discount'
  ],
  'brand_awareness': [
    'Introducing [Business Name]',
    'Your neighborhood [service] experts',
    'Now serving your area',
    'Meet your local team',
    'Proudly serving the community'
  ],
  'call_to_action': [
    'Call today to schedule',
    'Visit our website',
    'Follow us on social media',
    'Book online now',
    'Text us for quick service'
  ],
  'service_focus': [
    'Expert [service] available',
    'Professional [service] you can trust',
    'Quality [service] since [year]',
    'Certified [service] professionals',
    'Fast and reliable [service]'
  ]
};

const industrySpecificGoals: Record<string, string[]> = {
  'restaurant': [
    'Try our new menu items',
    'Order online for pickup',
    'Book your reservation',
    'Catering services available',
    'Happy hour specials daily'
  ],
  'dental': [
    'Schedule your checkup',
    'New patient exam special',
    'Teeth whitening promotion',
    'Emergency dental care available',
    'Family dentistry services'
  ],
  'salon': [
    'Book your appointment',
    'New client discount',
    'Wedding party packages',
    'Hair styling specialists',
    'Color correction experts'
  ],
  'automotive': [
    'Oil change special',
    'Free vehicle inspection',
    'Brake service discount',
    'Emergency roadside assistance',
    'Quality auto repair'
  ],
  'fitness': [
    'Join our gym today',
    'Personal training available',
    'Group fitness classes',
    'New member special',
    'Achieve your fitness goals'
  ],
  'legal': [
    'Free consultation available',
    'Experienced legal representation',
    'Personal injury specialists',
    'Estate planning services',
    'Protect your rights'
  ],
  'real_estate': [
    'Sell your home fast',
    'Free home valuation',
    'Expert market knowledge',
    'First-time buyer programs',
    'Investment property specialists'
  ],
  'retail': [
    'New arrivals in stock',
    'End of season sale',
    'Customer loyalty rewards',
    'Expert product advice',
    'Quality products guaranteed'
  ]
};

const businessTypeGoals: Record<string, string[]> = {
  'hair_salon': [
    'Transform your look',
    'Expert hair styling',
    'Color specialists',
    'Bridal hair packages',
    'Book your cut and style'
  ],
  'barbershop': [
    'Classic cuts and shaves',
    'Modern styling available',
    'Walk-ins welcome',
    'Traditional barbering',
    'Hot towel shave special'
  ],
  'nail_salon': [
    'Perfect manicure and pedicure',
    'Gel nail specialists',
    'Nail art available',
    'Relaxing spa experience',
    'Group appointments welcome'
  ],
  'auto_repair': [
    'Honest auto repair',
    'Quick oil changes',
    'Brake specialists',
    'Engine diagnostics',
    'Quality parts guaranteed'
  ],
  'restaurant': [
    'Fresh ingredients daily',
    'Family-friendly dining',
    'Takeout and delivery',
    'Special occasion catering',
    'Authentic cuisine'
  ]
};

function generateDynamicGoals(industry: string, businessTypes: string[]): string[] {
  const suggestions: string[] = [];
  
  // Add industry-specific goals
  const normalizedIndustry = industry.toLowerCase().replace(/\s+/g, '_');
  if (industrySpecificGoals[normalizedIndustry]) {
    suggestions.push(...industrySpecificGoals[normalizedIndustry]);
  }
  
  // Add business type specific goals
  businessTypes.forEach(type => {
    const normalizedType = type.toLowerCase().replace(/\s+/g, '_');
    if (businessTypeGoals[normalizedType]) {
      suggestions.push(...businessTypeGoals[normalizedType]);
    }
  });
  
  // Add generic goals from each category
  Object.values(goalSuggestionsByCategory).forEach(categoryGoals => {
    suggestions.push(...categoryGoals.slice(0, 2)); // Take first 2 from each category
  });
  
  // Remove duplicates and shuffle
  const uniqueSuggestions = Array.from(new Set(suggestions));
  
  // Shuffle array
  for (let i = uniqueSuggestions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [uniqueSuggestions[i], uniqueSuggestions[j]] = [uniqueSuggestions[j], uniqueSuggestions[i]];
  }
  
  // Return top 8 suggestions
  return uniqueSuggestions.slice(0, 8);
}

export async function POST(request: NextRequest) {
  try {
    const { industry, businessTypes } = await request.json();
    
    if (!industry || typeof industry !== 'string') {
      return NextResponse.json(
        { error: 'Industry is required' },
        { status: 400 }
      );
    }
    
    const suggestions = generateDynamicGoals(industry, businessTypes || []);
    
    return NextResponse.json({
      suggestions,
      industry,
      businessTypes: businessTypes || []
    });
    
  } catch (error) {
    console.error('Error generating campaign goal suggestions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 