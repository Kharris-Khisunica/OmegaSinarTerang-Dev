// Guard per-role. Dipakai lewat definePageMeta({ roles: ['MASTER', ...] }) di halaman
// yang perlu dibatasi — kosongkan/hilangkan meta roles kalau semua role login boleh akses.
export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/login') return

  const requiredRoles = to.meta.roles
  if (!requiredRoles || requiredRoles.length === 0) return

  const { user } = useAuth()
  if (!user.value || !requiredRoles.includes(user.value.role)) {
    return navigateTo('/')
  }
})
