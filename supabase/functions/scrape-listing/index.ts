import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const EXTRACTION_PROMPT = `You are a real estate data extraction expert. Your job is to extract EVERY piece of information from the provided content about a real estate listing/development project.

You MUST return ONLY valid JSON with ALL of these fields. Be EXTREMELY thorough - extract every detail, even if it requires reading between the lines. Use null for truly missing data, [] for empty arrays.

{
  "title": "project/listing name",
  "price": null or number (starting price, e.g. 650000),
  "beds": null or number (max bedrooms available),
  "baths": null or number,
  "address": "full street address with city, state, zip",
  "area": "MUST be one of: Manhattan, LIC, Queens, Flushing, Brooklyn, Jersey City, Long Island, Astoria, Williamsburg, Hoboken, Bronx, Staten Island, Other",
  "property_type": "e.g. Condominium, Co-op, Townhouse, Rental",
  "sponsor": "developer/sponsor company name",
  "total_floors": null or number,
  "total_units": null or number (residential units only),
  "completion_date": "estimated completion/delivery date",
  "description": "2-3 paragraph project overview covering positioning, what makes it special, overall concept. Be detailed and thorough.",
  "transportation": "ALL transit details: subway lines with station names, walk times, bus routes, commute times to key destinations like Grand Central, Midtown, etc. Include every line and time mentioned.",
  "schools": "school district number, ALL nearby schools with full names, any education notes",
  "views_description": "ALL view/scenery details: waterfront, river views, city skyline, park views, which floors get what views, any future development impacts on views",
  "architecture": "architecture firm name, building structure details, lobby description, ceiling heights for EACH floor type (standard, upper, penthouse), facade materials, any special structural features",
  "interior_design": "interior design firm name and background, their notable past projects, awards, design style, any press mentions (Architectural Digest, etc.)",
  "investment_info": "ALL investment data: reference rents by unit type, purchase price examples, gross yield calculations, net yield after expenses, market positioning, hold strategy recommendations",
  "target_buyers": "ALL buyer profiles mentioned: commuters, families, investors, etc. with specific details",
  "area_info": "neighborhood overview, sub-area positioning within the larger area, comparison to nearby zones, lifestyle character of the location",
  "summary": "3-sentence summary capturing: location + structure, key selling point, ideal buyer profile",
  "highlights": ["extract EVERY highlight/advantage mentioned, each as a separate string item. Include structural, location, amenity, and lifestyle highlights"],
  "amenities": ["extract EVERY amenity mentioned: doorman, gym, pool, rooftop, lounge, parking, bike room, children's playroom, etc."],
  "unit_types": [{"type": "Studio", "price": "$650,000起"}, {"type": "1BR", "price": "$940,000 - $1,250,000"}]
}

CRITICAL RULES:
1. Extract EVERYTHING - do not summarize or skip details
2. For Chinese content, keep ALL text in Chinese. For English, keep in English. Do not translate.
3. For highlights array: extract at least 5-10 items if the content is detailed
4. For amenities: list every single one mentioned, even if briefly
5. For unit_types: include ALL unit types with their price ranges, including penthouses
6. transportation: include ALL subway lines, stations, and commute times
7. architecture: include ALL ceiling height specs for different floor levels
8. interior_design: include the firm's background, notable projects, and awards
9. investment_info: include specific rent numbers, yield calculations, and strategy advice`;

const MIME_MAP: Record<string, string> = {
  'pdf': 'application/pdf',
  'doc': 'application/msword',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'xls': 'application/vnd.ms-excel',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'ppt': 'application/vnd.ms-powerpoint',
  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'webp': 'image/webp',
  'gif': 'image/gif',
};

async function extractWithAI(content: string, fileData?: { base64: string; mimeType: string }): Promise<any> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    console.warn('LOVABLE_API_KEY not configured');
    return null;
  }

  try {
    const messages: any[] = [
      { role: 'system', content: EXTRACTION_PROMPT },
    ];

    if (fileData) {
      // Multimodal: send file as inline data for Gemini
      messages.push({
        role: 'user',
        content: [
          ...(content ? [{ type: 'text', text: content }] : []),
          {
            type: 'image_url',
            image_url: {
              url: `data:${fileData.mimeType};base64,${fileData.base64}`,
            },
          },
          { type: 'text', text: 'Extract ALL real estate listing information from the above document/image. Be extremely thorough.' },
        ],
      });
    } else {
      messages.push({
        role: 'user',
        content: content.substring(0, 50000),
      });
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI gateway error:', response.status, errText);
      return null;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
    const jsonStr = jsonMatch[1]?.trim();

    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('AI extraction error:', error);
    return null;
  }
}

function buildResult(extracted: any, ogImage: string | null, sourceUrl: string, pageTitle: string) {
  return {
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
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { url, document_content, file_base64, file_type } = body;

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
        body: JSON.stringify({ url: formattedUrl, formats: ['markdown'], onlyMainContent: false }),
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

      console.log('Scraped markdown length:', markdown.length);
    }

    // Mode 2: Binary file (PDF, Word, images, etc.)
    if (file_base64 && file_type) {
      const ext = file_type.toLowerCase();
      const mimeType = MIME_MAP[ext] || `application/${ext}`;

      console.log('Processing binary file, type:', ext, 'size:', file_base64.length);

      const extracted = await extractWithAI(
        document_content || '',
        { base64: file_base64, mimeType }
      );

      if (extracted) {
        const result = buildResult(extracted, ogImage, sourceUrl, pageTitle);
        console.log('Binary file extraction result:', JSON.stringify(result).substring(0, 500));
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'Failed to extract data from file' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mode 3: Text content (md, txt, csv, html)
    if (document_content) {
      markdown = document_content;
    }

    if (!markdown) {
      return new Response(JSON.stringify({ error: 'No content to process' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use AI to extract all fields
    const fullContent = `${pageTitle ? `Title: ${pageTitle}\n` : ''}${markdown}`;
    const extracted = await extractWithAI(fullContent);

    if (extracted) {
      const result = buildResult(extracted, ogImage, sourceUrl, pageTitle);
      console.log('AI extraction result:', JSON.stringify(result).substring(0, 500));
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fallback: basic regex
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

    return new Response(JSON.stringify({
      title: pageTitle.substring(0, 200), cover_image: ogImage,
      price, beds, baths, area: null, source_url: sourceUrl,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
