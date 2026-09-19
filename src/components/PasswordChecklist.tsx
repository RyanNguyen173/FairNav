import { Check, X } from '@phosphor-icons/react'
import { PASSWORD_RULES } from '../auth/passwordRules'

/** Live checklist shown under a new-password field - reused at signup and on the password reset page. */
export function PasswordChecklist({ password }: { password: string }) {
  return (
    <ul className="mt-2 space-y-1">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password)
        return (
          <li
            key={rule.id}
            className={['flex items-center gap-1.5 text-xs', met ? 'text-success' : 'text-muted-foreground'].join(' ')}
          >
            {met ? (
              <Check size={12} weight="bold" aria-hidden="true" />
            ) : (
              <X size={12} weight="bold" aria-hidden="true" />
            )}
            {rule.label}
          </li>
        )
      })}
    </ul>
  )
}
