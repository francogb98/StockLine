'use client'

import { motion } from 'framer-motion'
import { Users, Plus, UserCircle, Shield, UserCog } from 'lucide-react'
import { staggerContainer } from '../animation-variants'

const users = [
  { name: 'Carlos García', role: 'Administrador', email: 'carlos@example.com', icon: Shield },
  { name: 'María López', role: 'Vendedor', email: 'maria@example.com', icon: UserCircle },
  { name: 'Juan Pérez', role: 'Vendedor', email: 'juan@example.com', icon: UserCircle },
  { name: 'Lucía Martínez', role: 'Vendedor', email: 'lucia@example.com', icon: UserCircle },
]

export function UsersView() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-4 px-5 py-4"
    >
      <div className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <Users className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-card-foreground">Usuarios</p>
          <p className="text-xs text-muted-foreground">{users.length} usuarios registrados</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
        >
          <Plus className="h-4 w-4" />
        </motion.button>
      </div>

      <div className="space-y-1">
        {users.map((user, i) => {
          const Icon = user.icon
          return (
            <motion.div
              key={user.email}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.25, ease: [0.32, 0.72, 0, 1] } }}
              className="flex items-center gap-3 rounded-xl px-3 py-3.5"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${user.role === 'Administrador' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-muted text-muted-foreground'}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${user.role === 'Administrador' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-muted text-muted-foreground'}`}>
                {user.role}
              </span>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
