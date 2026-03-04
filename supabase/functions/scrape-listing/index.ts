import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const EXTRACTION_PROMPT = `You are a real estate data extraction assistant. Extract ALL available information from the following listing content and return it as a JSON object.

Return ONLY valid JSON with these fields (use null for missing data, [] for empty arrays):
{
  "title": "listing title/name",
  "price": null or number (e.g. 1500000),
  "beds": null or number,
  "baths": null or number,
  "address": "full address",
  "area": "one of: Manhattan, LIC, Queens, Flushing, Brooklyn, Jersey City, Long Island, Astoria, Williamsburg, Hoboken, Bronx, Staten Island, Other",
  "property_type": "e.g. Condominium, Co-op, Townhouse",
  "sponsor": "developer/sponsor name",
  "total_floors": null or number,
  "total_units": null or number,
  "completion_date": "estimated completion",
  "description": "project overview and positioning (2-3 paragraphs)",
  "transportation": "subway lines, commute times, transit details",
  "schools": "nearby schools and school district",
  "views_description": "views, waterfront, scenery details",
  "architecture": "architecture team, building design, ceiling heights, structural details",
  "interior_design": "interior design team, style, notable projects",
  "investment_info": "rental yields, investment logic, price analysis",
  "target_buyers": "ideal buyer profiles",
  "area_info": "neighborhood overview, area positioning",
  "summary": "3-sentence summary of the project",
  "highlights": ["key highlight 1", "key highlight 2", ...],
  "amenities": ["amenity 1", "amenity 2", ...],
  "unit_types": [{"type": "Studio", "price": "$650,000起"}, {"type": "1BR", "price": "$940,000 - $1,250,000"}, ...]
}

Be thorough - extract every piece of information available. For Chinese content, keep descriptions in Chinese. For English content, keep in English.`;

async function extractWithAI(content: string): Promise<any> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    console.warn('LOVABLE_API_KEY not configured, skipping AI extraction');
    return null;
  }

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: EXTRACTION_PROMPT },
          { role: 'user', content: content.substring(0, 30000) },
        ],
        temperature: 0.1,
      }),
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
    const jsonStr = jsonMatch[1]?.trim();
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('AI extraction error:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { url, document_content } = body;

    let markdown = '';
    let ogImage: string | null = null;
    let pageTitle = '';
    let sourceUrl = url || '';

    // Mode 1: Scrape from URL
    if (url) {
      const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
      if (!apiKey) {
        return new Response(JSON.stringify({ error: 'Firecrawl not configured' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let formattedUrl = url.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = `https://${formattedUrl}`;
      }
      sourceUrl = formattedUrl;

      console.log('Scraping URL via Firecrawl:', formattedUrl);

      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: formattedUrl, formats: ['markdown'], onlyMainContent: true }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('Firecrawl error:', data);
        return new Response(JSON.stringify({ error: data.error || 'Scrape failed' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const metadata = data.data?.metadata || data.metadata || {};
      markdown = data.data?.markdown || data.markdown || '';
      ogImage = metadata.ogImage || metadata.image || null;
      pageTitle = metadata.ogTitle || metadata.title || '';
    }

    // Mode 2: Parse uploaded document content
    if (document_content) {
      markdown = document_content;
    }

    if (!markdown && !document_content) {
      return new Response(JSON.stringify({ error: 'No content to process' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use AI to extract all fields
    const fullContent = `${pageTitle ? `Title: ${pageTitle}\n` : ''}${markdown}`;
    const extracted = await extractWithAI(fullContent);

    if (extracted) {
      // Merge AI extraction with scraped metadata
      const result = {
        title: extracted.title || pageTitle || '',
        cover_image: ogImage || null,
        price: extracted.price || null,
        beds: extracted.beds || null,
        baths: extracted.baths || null,
        area: extracted.area || null,
        source_url: sourceUrl,
        address: extracted.address || null,
        property_type: extracted.property_type || null,
        sponsor: extracted.sponsor || null,
        total_floors: extracted.total_floors || null,
        total_units: extracted.total_units || null,
        completion_date: extracted.completion_date || null,
        description: extracted.description || null,
        transportation: extracted.transportation || null,
        schools: extracted.schools || null,
        views_description: extracted.views_description || null,
        architecture: extracted.architecture || null,
        interior_design: extracted.interior_design || null,
        investment_info: extracted.investment_info || null,
        target_buyers: extracted.target_buyers || null,
        area_info: extracted.area_info || null,
        summary: extracted.summary || null,
        highlights: extracted.highlights || [],
        amenities: extracted.amenities || [],
        unit_types: extracted.unit_types || [],
      };

      console.log('AI extraction result:', JSON.stringify(result).substring(0, 500));
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fallback: basic regex extraction (no AI)
    const fullText = `${pageTitle} ${markdown}`.toLowerCase();
    let price: number | null = null;
    const priceMatch = fullText.match(/\$\s?([\d,]+(?:\.\d+)?)/i);
    if (priceMatch) {
      const parsed = parseFloat(priceMatch[1].replace(/,/g, ''));
      if (parsed > 100) price = parsed;
    }
    let beds: number | null = null;
    const bedMatch = fullText.match(/(\d+)\s*(?:bed|br|bedroom)/i);
    if (bedMatch) beds = parseInt(bedMatch[1]);
    let baths: number | null = null;
    const bathMatch = fullText.match(/(\d+(?:\.\d+)?)\s*(?:bath|ba|bathroom)/i);
    if (bathMatch) baths = parseFloat(bathMatch[1]);

    const result = {
      title: pageTitle.substring(0, 200),
      cover_image: ogImage,
      price, beds, baths,
      area: null,
      source_url: sourceUrl,
    };

    console.log('Fallback result:', JSON.stringify(result));
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
