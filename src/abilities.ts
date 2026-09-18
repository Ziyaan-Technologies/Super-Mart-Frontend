import { AbilityBuilder, Ability } from '@casl/ability'

export type Actions = string
export type Subjects = string

export type AppAbility = Ability<[Actions, Subjects]>

type Permission = {
  permission_key: string
  module_name: string
}

export function defineAbilities(permissions: Permission[]): AppAbility {
  const { can, rules } = new AbilityBuilder<AppAbility>(Ability)
  permissions.forEach(p => can(p.permission_key, p.module_name))
  return new Ability(rules) as AppAbility
}
