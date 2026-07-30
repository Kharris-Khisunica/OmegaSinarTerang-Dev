<script setup lang="ts">
import { navigationGroups } from '~/config/navigation'

const { user, logout } = useAuth()
const { activeRole } = useAuthUser()
const router = useRouter()

const links = computed(() =>
  navigationGroups
    .map(group => group.filter(item => !item.roles || item.roles.includes(activeRole.value)))
    .filter(group => group.length > 0)
)

const ROLE_LABEL: Record<string, string> = {
  MASTER: 'Master',
  SUPERVISOR: 'Supervisor',
  OPERATOR: 'Operator'
}

const userMenuItems = [
  [
    {
      label: 'Keluar',
      icon: 'i-lucide-log-out',
      onSelect: async () => {
        await logout()
        await router.push('/login')
      }
    }
  ]
]
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="main-sidebar"
      collapsible
      resizable
      :min-size="12"
      :default-size="16"
      :max-size="20"
    >
      <template #header>
        <NuxtLink
          to="/"
          class="flex items-center gap-2"
        >
          <AppLogo class="w-auto h-6 shrink-0" />
        </NuxtLink>
      </template>

      <template #default>
        <UNavigationMenu
          :items="links"
          orientation="vertical"
        />
      </template>

      <template #footer>
        <UColorModeButton />
      </template>
    </UDashboardSidebar>

    <UDashboardPanel id="main-panel">
      <template #header>
        <UDashboardNavbar title="Omega Sinar Terang">
          <template #right>
            <UDropdownMenu
              v-if="user"
              :items="userMenuItems"
            >
              <UButton
                color="neutral"
                variant="ghost"
                trailing-icon="i-lucide-chevron-down"
              >
                <div class="text-left leading-tight">
                  <p class="text-sm font-medium">
                    {{ user.fullName }}
                  </p>
                  <p class="text-xs text-muted">
                    {{ ROLE_LABEL[user.role] ?? user.role }}
                  </p>
                </div>
              </UButton>
            </UDropdownMenu>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <slot />
      </template>
    </UDashboardPanel>

    <StepUpDialog />
  </UDashboardGroup>
</template>
