import { ROLE_HOME } from '~/config/navigation'

// Guard per-role. Dipakai lewat definePageMeta({ roles: ['MASTER', ...] }) di halaman
// yang perlu dibatasi — kosongkan/hilangkan meta roles kalau semua role login boleh akses.
export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/login') return

  const requiredRoles = to.meta.roles
  if (!requiredRoles || requiredRoles.length === 0) return

  const { user } = useAuth()
  if (!user.value || !requiredRoles.includes(user.value.role)) {
    // Redirect ke halaman rumah role ybs, BUKAN hardcode '/' — Supervisor
    // tidak punya akses ke '/' (Dashboard sekarang MASTER/OPERATOR saja),
    // jadi hardcode '/' akan bikin dia lempar ke halaman yang juga ditolak.
    const home = (user.value && ROLE_HOME[user.value.role]) || '/'
    if (to.path !== home) return navigateTo(home)
  }
})
