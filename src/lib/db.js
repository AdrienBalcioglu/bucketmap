import { supabase } from './supabase'
import { getUserId } from './userId'

/* ------------------------------------------------------------------ */
/*  Places                                                             */
/* ------------------------------------------------------------------ */

export async function fetchPlaces() {
  const userId = getUserId()
  const { data, error } = await supabase
    .from('bucketmap_places')
    .select('id, city_id, name, description, sort_order, created_at')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
  if (error) { console.error('Error fetching places:', error); return [] }
  return data || []
}

export async function addPlace(cityId, name, description) {
  const userId = getUserId()
  const { data, error } = await supabase
    .from('bucketmap_places')
    .insert({ user_id: userId, city_id: cityId, name, description })
    .select('id, city_id, name, description, sort_order, created_at')
    .single()
  if (error) { console.error('Error adding place:', error); return null }
  return data
}

export async function reorderPlace(placeId, sortOrder) {
  const { error } = await supabase
    .from('bucketmap_places')
    .update({ sort_order: sortOrder })
    .eq('id', placeId)
  if (error) { console.error('Error reordering place:', error); return false }
  return true
}

export async function deletePlace(placeId) {
  const { error } = await supabase
    .from('bucketmap_places')
    .delete()
    .eq('id', placeId)
  if (error) { console.error('Error deleting place:', error); return false }
  return true
}

export async function updatePlace(placeId, name, description) {
  const { data, error } = await supabase
    .from('bucketmap_places')
    .update({ name, description })
    .eq('id', placeId)
    .select('id, city_id, name, description, sort_order, created_at')
    .single()
  if (error) { console.error('Error updating place:', error); return null }
  return data
}

/* ------------------------------------------------------------------ */
/*  Destinations                                                        */
/* ------------------------------------------------------------------ */

export async function fetchDestinations() {
  const userId = getUserId()
  const { data, error } = await supabase
    .from('bucketmap_destinations')
    .select('id, name, flag, lng, lat, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) { console.error('Error fetching destinations:', error); return [] }
  return data || []
}

export async function addDestination(name, flag, lng, lat) {
  const userId = getUserId()
  const { data, error } = await supabase
    .from('bucketmap_destinations')
    .insert({ user_id: userId, name, flag, lng, lat })
    .select('id, name, flag, lng, lat, created_at')
    .single()
  if (error) { console.error('Error adding destination:', error); return null }
  return data
}

export async function deleteDestination(id) {
  const { error } = await supabase.from('bucketmap_destinations').delete().eq('id', id)
  if (error) { console.error('Error deleting destination:', error); return false }
  return true
}

/* ------------------------------------------------------------------ */
/*  Checked items                                                       */
/* ------------------------------------------------------------------ */

export async function fetchCheckedItems() {
  const userId = getUserId()
  const { data, error } = await supabase
    .from('bucketmap_checked_items')
    .select('id, item_key, checked')
    .eq('user_id', userId)
  if (error) { console.error('Error fetching checked items:', error); return [] }
  return data || []
}

/* ------------------------------------------------------------------ */
/*  Profiles                                                            */
/* ------------------------------------------------------------------ */

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('bucketmap_profiles')
    .select('user_id, title, theme, pin')
    .eq('user_id', userId)
    .single()
  if (error && error.code !== 'PGRST116') { console.error('Error fetching profile:', error) }
  return data || null
}

export async function saveProfile(userId, { title, theme, pin }) {
  const { error } = await supabase
    .from('bucketmap_profiles')
    .upsert({ user_id: userId, title, theme, pin, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) { console.error('Error saving profile:', error); return false }
  return true
}

export async function setCheckedItem(itemKey, checked) {
  const userId = getUserId()
  const { data, error } = await supabase
    .from('bucketmap_checked_items')
    .upsert({ user_id: userId, item_key: itemKey, checked }, { onConflict: 'user_id,item_key' })
    .select('item_key, checked')
    .single()
  if (error) { console.error('Error setting checked item:', error); return null }
  return data
}
