export default async function backendFetch(route, method, body = {}) {
  try {
    let init = {}
    if (method !== 'GET') {
      init = {
        method,
        body,
      }
    }
    const response = await fetch(`${process.env.API_URL}/${route}`, init)

    if (response.ok) {
      return await response.json()
    }
    return { error: response.statusText, statusCode: response.status }
  } catch (error) {
    return { error, statusCode: 500 }
  }
}