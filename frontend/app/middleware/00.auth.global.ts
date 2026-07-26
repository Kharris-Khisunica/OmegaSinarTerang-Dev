// Prefix "00." memastikan ini jalan sebelum 01.roles.global.ts (urutan alfabetis file).
export default defineNuxtRouteMiddleware(async (to) => {
  const { accessToken, ensureSession, logout } = useAuth()

  if (to.path === '/login') {
    if (accessToken.value) return navigateTo('/')
    return
  }

  const ok = await ensureSession()
  if (!ok) {
    await logout()
    return navigateTo(`/login?returnUrl=${encodeURIComponent(to.fullPath)}`)
  }
})
