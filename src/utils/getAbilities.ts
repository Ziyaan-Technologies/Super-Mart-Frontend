import { defineAbilities } from '@/abilities'
import { fetchPermissions } from '../services/permissionService';

export async function getAbilities() {
  if (!localStorage.getItem('jwt')) {
    return defineAbilities([])
  }

  let permissions = JSON.parse(localStorage.getItem('permissions') || 'null')

  if (!permissions) {
    permissions = await fetchPermissions()
    localStorage.setItem('permissions', JSON.stringify(permissions))
  }

  return defineAbilities(permissions)
}
