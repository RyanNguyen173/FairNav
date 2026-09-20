import { PASSWORD_RULES } from '../auth/passwordRules'

/** Live checklist shown under a new-password field on the sign-up form. */
export function PasswordChecklist({ password }: { password: string }) {
  return (
    <ul className="flex flex-col gap-1.5 py-0.5">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password)
        return (
          <li
            key={rule.id}
            className={[
              'flex items-center gap-2 text-[13px] transition-colors duration-150',
              met ? 'text-success' : 'text-muted-foreground',
            ].join(' ')}
          >
            <span className="w-3 font-mono text-xs" aria-hidden="true">
              {met ? '✓' : '·'}
            </span>
            {rule.label}
          </li>
        )
      })}
    </ul>
  )
}
