import { shallowRef, ref } from 'vue'
import type { App, Ref } from 'vue'
import * as abilityModule from '@/abilities'
import { fetchPermissions } from '@/services/permissionService'

type AppAbility = abilityModule.AppAbility
const defineAbilities = abilityModule.defineAbilities

const abilityRef = shallowRef(defineAbilities([]))
const abilityReady = ref(false)

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $ability: Ref<AppAbility>
    $abilityReady: Ref<boolean>
    $can: (action: string, subject: string) => boolean
    $getAbilities: (forceRefresh?: boolean) => Promise<AppAbility>
  }
}

export default {
  install(app: App) {
    app.config.globalProperties.$ability = abilityRef
    app.config.globalProperties.$abilityReady = abilityReady

    app.config.globalProperties.$getAbilities = async function (forceRefresh = false) {
      if (!localStorage.getItem('jwt')) {
        abilityRef.value = defineAbilities([])
        abilityReady.value = true
        return abilityRef.value
      }

      let permissions = null
      if (!forceRefresh) {
        permissions = JSON.parse(localStorage.getItem('permissions') || 'null')
      }

      if (!permissions) {
        permissions = await fetchPermissions()
        localStorage.setItem('permissions', JSON.stringify(permissions))
      }

      abilityRef.value = defineAbilities(permissions)
      abilityReady.value = true
      return abilityRef.value
    }

    app.config.globalProperties.$can = function (action: string, subject: string) {
      return abilityRef.value?.can(action, subject)
    }

    ;(async () => {
      await app.config.globalProperties.$getAbilities()
    })()
  }
}
