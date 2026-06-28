export function getUserId() {
  let id = localStorage.getItem('bucketmap-user-id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('bucketmap-user-id', id)
  }
  return id
}
