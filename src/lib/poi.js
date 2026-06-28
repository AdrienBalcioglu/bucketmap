/**
 * POI suggestions via Overpass API (OpenStreetMap).
 * Free, public, rate-limited (fair use: ~1 req/s).
 */
const OVERPASS_URL = '/api/overpass?data='
const TIMEOUT_MS = 10000

const CATEGORIES = {
  restaurant: { emoji: '🍽️', label: 'Restaurant', tags: ['amenity=restaurant', 'amenity=cafe', 'amenity=bar', 'amenity=pub', 'amenity=fast_food', 'amenity=bistro', 'amenity=food_court'] },
  culture:   { emoji: '🏛️', label: 'Culture',   tags: ['tourism=museum', 'tourism=gallery', 'tourism=attraction', 'tourism=viewpoint'] },
  park:      { emoji: '🌳', label: 'Park',      tags: ['leisure=park', 'leisure=garden', 'leisure=nature_reserve'] },
  monument:  { emoji: '🏰', label: 'Monument',  tags: ['historic=castle', 'historic=monument', 'historic=memorial', 'historic=ruins'] },
}

/**
 * Build an Overpass QL query searching for POI within `radius` meters of (lat, lng).
 */
function buildQuery(lat, lng, radius) {
  const parts = []
  for (const cat of Object.values(CATEGORIES)) {
    for (const tag of cat.tags) {
      const [key, val] = tag.split('=')
      parts.push(`node[${key}=${val}](around:${radius},${lat},${lng});`)
    }
  }
  return `[out:json][timeout:8];(${parts.join('')});out center 30;`
}

/**
 * Classify a raw OSM node into one of our categories.
 */
function classify(tags) {
  for (const [catKey, cat] of Object.entries(CATEGORIES)) {
    for (const tag of cat.tags) {
      const [key, val] = tag.split('=')
      if (tags[key] === val) return { key: catKey, emoji: cat.emoji, label: cat.label }
    }
  }
  return { key: 'other', emoji: '📍', label: 'Place' }
}

/**
 * Fetch POI suggestions around a location.
 * @param {number} lat
 * @param {number} lng
 * @param {number} radius - search radius in meters (default 5000)
 * @returns {Promise<{name: string, category: string, emoji: string, type: string}[]>}
 */
export async function fetchPOIs(lat, lng, radius = 5000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const query = buildQuery(lat, lng, radius)
    const url = OVERPASS_URL + encodeURIComponent(query)
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`)
    const json = await res.json()
    const elements = json.elements || []

    return elements
      .filter(el => el.tags && el.tags.name)
      .map(el => {
        const cls = classify(el.tags)
        return {
          name: el.tags.name,
          category: cls.label,
          emoji: cls.emoji,
          type: cls.key,
        }
      })
      .filter((v, i, a) => a.findIndex(x => x.name === v.name) === i) // dedupe by name
      .slice(0, 10)
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('Overpass API timed out')
    } else {
      console.error('Overpass API error:', err)
    }
    return null
  } finally {
    clearTimeout(timer)
  }
}