import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Firecrawl not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping URL via Firecrawl:', formattedUrl);

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl error:', data);
      return new Response(JSON.stringify({ error: data.error || 'Scrape failed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract metadata from Firecrawl response
    const metadata = data.data?.metadata || data.metadata || {};
    const markdown = data.data?.markdown || data.markdown || '';
    const ogImage = metadata.ogImage || metadata.image || null;
    const pageTitle = metadata.ogTitle || metadata.title || '';

    // Parse details from markdown + metadata
    const fullText = `${pageTitle} ${metadata.description || ''} ${markdown}`.toLowerCase();

    // Extract price
    let price: number | null = null;
    const pricePatterns = [
      /\$\s?([\d,]+(?:\.\d+)?)/i,
      /price[:\s]*\$?\s?([\d,]+)/i,
    ];
    for (const pattern of pricePatterns) {
      const match = fullText.match(pattern);
      if (match) {
        const parsed = parseFloat(match[1].replace(/,/g, ''));
        if (parsed > 100) { price = parsed; break; }
      }
    }

    // Extract beds/baths
    let beds: number | null = null;
    let baths: number | null = null;
    const bedMatch = fullText.match(/(\d+)\s*(?:bed|br|bedroom)/i);
    if (bedMatch) beds = parseInt(bedMatch[1]);
    const bathMatch = fullText.match(/(\d+(?:\.\d+)?)\s*(?:bath|ba|bathroom)/i);
    if (bathMatch) baths = parseFloat(bathMatch[1]);

    // Detect area
    const areaMap: [string, string][] = [
      ['long island city', 'LIC'], ['lic', 'LIC'],
      ['manhattan', 'Manhattan'], ['jersey city', 'Jersey City'],
      ['long island', 'Long Island'], ['queens', 'Queens'],
      ['flushing', 'Flushing'], ['brooklyn', 'Brooklyn'],
      ['bronx', 'Bronx'], ['staten island', 'Staten Island'],
      ['astoria', 'Astoria'], ['williamsburg', 'Williamsburg'],
      ['hoboken', 'Hoboken'], ['fort lee', 'Jersey City'],
    ];
    let area: string | null = null;
    for (const [keyword, value] of areaMap) {
      if (fullText.includes(keyword)) { area = value; break; }
    }

    const result = {
      title: pageTitle.substring(0, 200),
      cover_image: ogImage,
      price,
      beds,
      baths,
      area,
      source_url: formattedUrl,
    };

    console.log('Scrape result:', JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
