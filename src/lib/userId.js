export function getUserId() {
  let id = localStorage.getItem('cutemap-user-id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('cutemap-user-id', id)
  }
  return id
}
