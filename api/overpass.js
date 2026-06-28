export const config = {
  runtime: 'edge',
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await request.text()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12000)

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body,
      signal: controller.signal,
    })

    clearTimeout(timer)

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Overpass returned ${response.status}` }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, s-maxage=600',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Overpass unavailable' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
