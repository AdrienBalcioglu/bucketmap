export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12000)

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: req.body,
      signal: controller.signal,
    })

    clearTimeout(timer)

    if (!response.ok) {
      return res.status(response.status).json({ error: `Overpass returned ${response.status}` })
    }

    const data = await response.json()
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600')
    return res.status(200).json(data)
  } catch (err) {
    return res.status(502).json({ error: 'Overpass unavailable' })
  }
}