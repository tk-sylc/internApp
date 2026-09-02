export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request)
    const url = new URL(request.url)

    if (request.method === 'GET' && response.status === 404 && !url.pathname.includes('.')) {
      return env.ASSETS.fetch(new Request(new URL('/', url), request))
    }

    return response
  },
}
