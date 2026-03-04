import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch URL: ${response.status}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const html = await response.text();

    // Extract metadata from HTML using regex
    const getMetaContent = (property: string): string | null => {
      // Try og: tags first
      const ogMatch = html.match(new RegExp(`<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']*)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:${property}["']`, 'i'));
      if (ogMatch) return ogMatch[1];

      // Try name tags
      const nameMatch = html.match(new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${property}["']`, 'i'));
      if (nameMatch) return nameMatch[1];

      return null;
    };

    // Extract title
    const ogTitle = getMetaContent('title');
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = ogTitle || (titleMatch ? titleMatch[1].trim() : '');

    // Extract image
    const ogImage = getMetaContent('image');
    const image = ogImage || null;

    // Extract description for parsing details
    const description = getMetaContent('description') || '';
    const fullText = `${title} ${description}`.toLowerCase();

    // Try to extract price - look for $ followed by numbers
    let price: number | null = null;
    const pricePatterns = [
      /\$\s?([\d,]+(?:\.\d+)?)\s*(?:\/\s*(?:mo|month))?/i,
      /price[:\s]*\$?\s?([\d,]+)/i,
      /(\d{1,3}(?:,\d{3})+)\s*(?:\/\s*(?:mo|month))?/i,
    ];
    for (const pattern of pricePatterns) {
      const match = fullText.match(pattern) || title.match(pattern) || description.match(pattern);
      if (match) {
        const parsed = parseFloat(match[1].replace(/,/g, ''));
        if (parsed > 100) { // reasonable price
          price = parsed;
          break;
        }
      }
    }

    // Try to extract beds/baths
    let beds: number | null = null;
    let baths: number | null = null;
    const bedMatch = fullText.match(/(\d+)\s*(?:bed|br|bedroom)/i);
    if (bedMatch) beds = parseInt(bedMatch[1]);
    const bathMatch = fullText.match(/(\d+(?:\.\d+)?)\s*(?:bath|ba|bathroom)/i);
    if (bathMatch) baths = parseFloat(bathMatch[1]);

    // Try to detect area from known NYC areas
    const areas = [
      'LIC', 'Long Island City', 'Manhattan', 'Jersey City', 'Long Island',
      'Queens', 'Flushing', 'Brooklyn', 'Bronx', 'Staten Island',
      'Astoria', 'Williamsburg', 'Hoboken'
    ];
    let area: string | null = null;
    for (const a of areas) {
      if (fullText.includes(a.toLowerCase())) {
        // Map to enum values
        if (a === 'Long Island City') area = 'LIC';
        else area = a;
        break;
      }
    }

    const result = {
      title: title.substring(0, 200),
      cover_image: image,
      price,
      beds,
      baths,
      area,
      source_url: url,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
